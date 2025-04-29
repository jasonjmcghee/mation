import {Scene} from "./animation.ts";

const { FFmpeg } = (window as any).FFmpegWASM;
const ffmpeg = new FFmpeg();

const NODE_PORT = 3005;

document.addEventListener('DOMContentLoaded', async () => {
// Load ffmpeg
  await ffmpeg.load({
    coreURL: '/libs/ffmpeg/ffmpeg-core.js',
    wasmURL: '/libs/ffmpeg/ffmpeg-core.wasm'
  });
  console.log('FFmpeg loaded');
});

// Available output formats
export type OutputFormat = 'mp4' | 'zip' | 'node_mp4';

// Check which render formats are available
export function getAvailableFormats(): OutputFormat[] {
  const formats: OutputFormat[] = ['mp4', 'zip'];
  
  // Check if we have a server endpoint to render node_mp4
  if (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1') {
    formats.push('node_mp4');
  }
  
  return formats;
}

// Render animation to MP4 video using ffmpeg-wasm
export async function renderToVideo(scene: Scene, options: {
  framerate?: number;
  codec?: string;
  outputFile?: string;
  duration?: number;
  fps?: number;
  onProgress?: (progress: number) => void;
  outputFormat?: OutputFormat;
} = {}): Promise<void> {
  const {
    framerate = 60,
    codec = 'libx264',
    outputFile = 'out.mp4',
    onProgress,
    outputFormat = 'mp4'
  } = options;

  // Calculate frame times based on duration and framerate
  const totalDuration = scene.getDuration();
  const frameTimes = [];

  const timePerFrame = 1.0 / framerate;

  for (let i = 0; i <= totalDuration + timePerFrame; i += timePerFrame) {
    frameTimes.push(i);
  }

  // Pause any ongoing animation
  const wasPlaying = scene.playing();
  scene.pause();
  scene.seekToTime(0);

  const partial = 1.0 / frameTimes.length;
  const frameBlobs: Blob[] = [];
  const frameNames: string[] = [];

  // For each frame time, render at that time and capture
  for (let i = 0; i < frameTimes.length; i++) {
    scene.renderAtTime(frameTimes[i]);
    const blob: Blob = await new Promise((resolve) =>
      scene.canvas.toBlob((blob) => {
        resolve(blob as Blob);
      })
    );
    
    const frameName = `frame_${i.toString().padStart(6, '0')}.png`;
    frameNames.push(frameName);
    
    if (outputFormat === 'mp4') {
      ffmpeg.writeFile(frameName, new Uint8Array(await blob.arrayBuffer()));
    } else {
      frameBlobs.push(blob);
    }
    
    // Update progress (allocate up to 30% of progress bar to frame processing for mp4, 90% for zip)
    if (onProgress) {
      const progressMultiplier = outputFormat === 'mp4' ? 0.3 : 0.9;
      onProgress((progressMultiplier * (i * partial)));
    }
  }

  if (onProgress) onProgress(outputFormat === 'mp4' ? 0.3 : 0.9); // Frame capture completed

  if (outputFormat === 'mp4') {
    // Set up progress handler for ffmpeg
    ffmpeg.on('progress', ({ progress }: { progress: number; time: number }) => {
      if (onProgress) {
        const mappedProgress = 0.3 + (progress * 0.7);
        onProgress(mappedProgress);
      }
    });

    ffmpeg.on('log', (log: any) => {
      console.log(`ffmpeg log: ${JSON.stringify(log)}`);
    });

    // Run FFmpeg command to convert frames to video
    await ffmpeg.exec([
      '-framerate', String(framerate),
      '-pattern_type', 'glob',
      '-i', '*.png',
      '-c:v', codec,
      '-preset', 'medium',
      '-pix_fmt', 'yuv420p',
      '-crf', '18',
      outputFile
    ]);

    if (onProgress) onProgress(0.9); // Video encoding completed

    // Read the output file from the virtual filesystem
    const data = await ffmpeg.readFile(outputFile) as Uint8Array;

    // Create a download link for the video
    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = outputFile;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);
  } else if (outputFormat === 'node_mp4') {
    // Server-side rendering using WebSockets for efficient binary transfer
    const serverUrl = `ws://${window.location.hostname}:${NODE_PORT}`;
    let socket: WebSocket;
    
    try {
      // Connect to WebSocket server
      socket = new WebSocket(serverUrl);
      
      // Set up event handlers
      socket.onopen = function() {
        if (onProgress) onProgress(0.1); // Connected to server
        
        // Initialize a new session
        socket.send(JSON.stringify({
          type: 'init',
          metadata: {
            framerate,
            codec,
            totalFrames: frameBlobs.length
          }
        }));
      };
      
      socket.onmessage = async function(event) {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'init':
            // Session initialized, start sending frames
            if (onProgress) onProgress(0.15);
            await sendFrames(socket, frameBlobs);
            break;
            
          case 'frame_received':
            // Frame received confirmation
            if (onProgress) {
              // Allocate 70% of progress to frame uploads (from 0.15 to 0.85)
              const uploadProgress = 0.15 + ((message.index + 1) / frameBlobs.length * 0.7);
              onProgress(uploadProgress);
            }
            
            // If this was the last frame, start rendering
            if (message.index === frameBlobs.length - 1) {
              socket.send(JSON.stringify({
                type: 'render',
                framerate,
                codec
              }));
            }
            break;
            
          case 'render_started':
            if (onProgress) onProgress(0.85);
            break;
            
          case 'progress':
            if (onProgress) {
              // Allocate remaining 15% to rendering progress
              const renderProgress = 0.85 + ((message.frame / message.totalFrames) * 0.13);
              onProgress(Math.min(renderProgress, 0.98));
            }
            break;
            
          case 'completed':
            if (onProgress) onProgress(0.98);
            
            // Create download link
            const url = `http://${window.location.hostname}:${NODE_PORT}${message.downloadUrl}`;
            const link = document.createElement('a');
            link.href = url;
            link.download = outputFile;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            if (onProgress) onProgress(1.0);
            socket.close();
            break;
            
          case 'error':
            console.error('Server error:', message.message);
            throw new Error(`Server error: ${message.message}`);
        }
      };
      
      socket.onerror = function(error) {
        console.error('WebSocket error:', error);
        throw new Error('WebSocket connection error');
      };
      
      // Wait for the socket to close or error out
      await new Promise((resolve, reject) => {
        socket.onclose = resolve;
        socket.onerror = reject;
      });
      
    } catch (error) {
      console.error('Error in node_mp4 rendering:', error);
      // @ts-ignore
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
      throw error;
    }
  } else {
    // Create a zip file with JSZip
    const JSZip = (window as any).JSZip;
    if (!JSZip) {
      throw new Error('JSZip library is not loaded. Please include JSZip in your project.');
    }
    
    const zip = new JSZip();
    
    // Add all frame PNGs to the zip
    for (let i = 0; i < frameBlobs.length; i++) {
      zip.file(frameNames[i], frameBlobs[i]);
    }
    
    // Generate the zip file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Create a download link for the zip
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = outputFile.replace(/\.\w+$/, '') + '.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
  }
  
  // Helper function to send frames to the WebSocket server
  async function sendFrames(socket: WebSocket, frames: Blob[]) {
    for (let i = 0; i < frames.length; i++) {
      // Wait for socket to be ready for sending
      while (socket.bufferedAmount > 1024 * 1024) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Convert Blob to ArrayBuffer
      const arrayBuffer = await frames[i].arrayBuffer();
      
      // Send the binary frame data
      socket.send(arrayBuffer);
      
      // Small delay to prevent overwhelming the socket
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  }

  // Restore play state
  if (wasPlaying) {
    scene.play();
  }

  if (onProgress) onProgress(1); // Process completed
}
