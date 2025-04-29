// server.js - WebSocket server for efficient frame rendering with FFmpeg

import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { rimraf } from 'rimraf';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const rimrafAsync = promisify(rimraf);

// Get directory path
const __dirname = process.cwd();

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Create directories
const TEMP_DIR = path.join(__dirname, 'temp_frames');
const OUTPUT_DIR = path.join(__dirname, 'output');

// Ensure directories exist
async function ensureDirectories() {
  if (!fs.existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }
  if (!fs.existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }
}

// Track active rendering sessions
const sessions = new Map();

// Create WebSocket server
const wss = new WebSocketServer({ server });

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected');
  let sessionId = null;
  let frameCount = 0;

  // Handle messages from client
  ws.on('message', async (message) => {
    // Check if message is binary or JSON
    if (typeof message === 'string' || message instanceof Buffer && message.toString().startsWith('{')) {
      // Handle JSON control messages
      try {
        const controlMessage = JSON.parse(message.toString());
        
        if (controlMessage.type === 'init') {
          // Create new session
          sessionId = Date.now().toString();
          const sessionDir = path.join(TEMP_DIR, sessionId);
          await mkdir(sessionDir, { recursive: true });
          
          sessions.set(sessionId, {
            ws,
            directory: sessionDir,
            status: 'created',
            frameCount: 0,
            metadata: controlMessage.metadata || {}
          });
          
          console.log(`Session created: ${sessionId}`);
          ws.send(JSON.stringify({ type: 'init', sessionId }));
        } 
        else if (controlMessage.type === 'render') {
          if (!sessionId || !sessions.has(sessionId)) {
            ws.send(JSON.stringify({ type: 'error', message: 'No active session' }));
            return;
          }
          
          const session = sessions.get(sessionId);
          const { framerate = 60 } = controlMessage;
          
          try {
            // Start FFmpeg process
            await startRendering(sessionId, framerate);
            ws.send(JSON.stringify({ type: 'render_started' }));
          } catch (err) {
            console.error('Error starting render:', err);
            ws.send(JSON.stringify({ type: 'error', message: err.message }));
          }
        }
      } catch (err) {
        console.error('Error parsing control message:', err);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid control message' }));
      }
    } else {
      // Handle binary frame data
      if (!sessionId || !sessions.has(sessionId)) {
        ws.send(JSON.stringify({ type: 'error', message: 'No active session' }));
        return;
      }
      
      try {
        const session = sessions.get(sessionId);
        const framePath = path.join(session.directory, `frame_${frameCount.toString().padStart(6, '0')}.png`);
        
        // Save binary frame data directly to file
        await writeFile(framePath, message);
        frameCount++;
        
        // Update session
        session.frameCount = frameCount;
        ws.send(JSON.stringify({ type: 'frame_received', index: frameCount - 1 }));
      } catch (err) {
        console.error('Error saving frame:', err);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to save frame' }));
      }
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
    // Clean up abandoned sessions later
  });
});

// Start rendering video with FFmpeg
async function startRendering(sessionId, framerate, codec) {
  if (!sessions.has(sessionId)) {
    throw new Error('Session not found');
  }
  
  const session = sessions.get(sessionId);
  session.status = 'rendering';
  
  // Output file path
  const outputFile = path.join(OUTPUT_DIR, `output_${sessionId}.mp4`);
  session.outputFile = outputFile;
  
  // FFmpeg command to render video
  const ffmpegArgs = [
    '-framerate', String(framerate),
    '-pattern_type', 'glob',
    '-i', path.join(session.directory, '*.png'),
    '-c:v', 'h264_videotoolbox',
    outputFile
  ];
  
  console.log('Running FFmpeg with args:', ffmpegArgs.join(' '));
  
  // Execute FFmpeg
  const ffmpeg = spawn('ffmpeg', ffmpegArgs);
  
  let ffmpegOutput = '';
  
  ffmpeg.stdout.on('data', (data) => {
    ffmpegOutput += data.toString();
  });
  
  ffmpeg.stderr.on('data', (data) => {
    const output = data.toString();
    ffmpegOutput += output;
    
    // Try to parse progress
    const frameMatch = output.match(/frame=\s*(\d+)/);
    if (frameMatch && session.ws) {
      try {
        session.ws.send(JSON.stringify({ 
          type: 'progress', 
          frame: parseInt(frameMatch[1], 10),
          totalFrames: session.frameCount
        }));
      } catch (err) {
        console.error('Error sending progress:', err);
      }
    }
  });
  
  return new Promise((resolve, reject) => {
    ffmpeg.on('error', (err) => {
      console.error('FFmpeg error:', err);
      session.status = 'error';
      session.error = err.message;
      
      if (session.ws) {
        try {
          session.ws.send(JSON.stringify({ type: 'error', message: err.message }));
        } catch (err) {
          console.error('Error sending error message:', err);
        }
      }
      
      reject(err);
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        session.status = 'completed';
        console.log(`Video rendering completed: ${outputFile}`);
        
        if (session.ws) {
          try {
            session.ws.send(JSON.stringify({ 
              type: 'completed', 
              outputFile: path.basename(outputFile),
              downloadUrl: `/download/${path.basename(outputFile)}`
            }));
          } catch (err) {
            console.error('Error sending completion message:', err);
          }
        }
        
        resolve(outputFile);
      } else {
        session.status = 'error';
        session.error = `FFmpeg exited with code ${code}: ${ffmpegOutput}`;
        console.error(`FFmpeg error (exit code ${code}):`);
        console.error(ffmpegOutput);
        
        if (session.ws) {
          try {
            session.ws.send(JSON.stringify({ 
              type: 'error', 
              message: `FFmpeg exited with code ${code}`
            }));
          } catch (err) {
            console.error('Error sending error message:', err);
          }
        }
        
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
  });
}

// Serve static files for downloading rendered videos
app.use('/download', express.static(OUTPUT_DIR));

// API endpoint to check if server is running
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok' });
});

// Start the server
async function start() {
  await ensureDirectories();
  
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
    console.log(`Frames directory: ${TEMP_DIR}`);
    console.log(`Output directory: ${OUTPUT_DIR}`);
  });
}

start();

// Clean up function to remove all temporary files on server exit
process.on('SIGINT', async () => {
  console.log('Cleaning up before exit...');
  try {
    if (fs.existsSync(TEMP_DIR)) {
      await rimrafAsync(TEMP_DIR);
    }
  } catch (err) {
    console.error('Error during cleanup:', err);
  }
  process.exit();
});