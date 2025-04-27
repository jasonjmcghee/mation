import {Scene} from "./animation.ts";

const { FFmpeg } = (window as any).FFmpegWASM;
const ffmpeg = new FFmpeg();

document.addEventListener('DOMContentLoaded', async () => {
// Load ffmpeg
  await ffmpeg.load({
    coreURL: '/libs/ffmpeg/ffmpeg-core.js',
    wasmURL: '/libs/ffmpeg/ffmpeg-core.wasm'
  });
  console.log('FFmpeg loaded');
});

// Render animation to MP4 video using ffmpeg-wasm
export async function renderToVideo(scene: Scene, options: {
  framerate?: number;
  codec?: string;
  outputFile?: string;
  duration?: number;
  fps?: number;
  onProgress?: (progress: number) => void;
} = {}): Promise<void> {
  const {
    framerate = 60,
    codec = 'libx264',
    outputFile = 'out.mp4',
    onProgress,
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

  // For each frame time, render at that time and capture
  for (let i = 0; i < frameTimes.length; i++) {
    scene.renderAtTime(frameTimes[i]);
    const blob: Blob = await new Promise((resolve) =>
      scene.canvas.toBlob((blob) => {
        resolve(blob as Blob);
      })
    );
    const frameName = `frame_${i.toString().padStart(6, '0')}.png`;
    ffmpeg.writeFile(frameName, new Uint8Array(await blob.arrayBuffer()));
    // Update progress (allocate 5% - 30% of progress bar to frame processing)
    if (onProgress) {
      onProgress((0.3 * (i * partial)));
    }
  }

  if (onProgress) onProgress(0.3); // Frame capture completed

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

  // Restore play state
  if (wasPlaying) {
    scene.play();
  }

  if (onProgress) onProgress(1); // Process completed
}
