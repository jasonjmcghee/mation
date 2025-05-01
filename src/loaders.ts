/**
 * Mation library loaders
 * This module provides functions to dynamically load external libraries needed by Mation
 */

/**
 * Configuration options for library loading
 */
export interface LibraryConfig {
  /** Base path to load libraries from, defaults to finding from the current script */
  basePath?: string;
}

/**
 * Check if a script is already loaded
 */
function isScriptLoaded(src: string): boolean {
  return !!document.querySelector(`script[src*="${src}"]`);
}

/**
 * Get the base path for loading libraries based on the current script
 */
function getBasePath(): string {
  // Try to find the path to the Mation script that's currently running
  const scripts = Array.from(document.getElementsByTagName('script'));
  const mationScript = scripts.find(script => 
    script.src && (script.src.includes('mation.js') || script.src.includes('mation.min.js'))
  );

  if (mationScript) {
    // Extract the base path from the script URL
    const scriptUrl = new URL(mationScript.src);
    const pathParts = scriptUrl.pathname.split('/');
    // Remove the filename to get the directory
    pathParts.pop();
    // Handle special case of serving from root
    return pathParts.length === 0 ? '/' : `${scriptUrl.origin}${pathParts.join('/')}`;
  }

  // Fallback to the current location if we can't find the script
  return window.location.origin;
}

/**
 * Load a script dynamically
 */
async function loadScript(src: string): Promise<void> {
  if (isScriptLoaded(src)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (error) => reject(new Error(`Failed to load script: ${src}: ${error}`));
    document.head.appendChild(script);
  });
}

/**
 * Async function to load FFmpeg libraries
 */
export async function loadFFmpeg(config: LibraryConfig = {}): Promise<void> {
  const basePath = config.basePath || getBasePath();
  
  try {
    // Check if FFmpeg is already loaded
    if ((window as any).ffmpegInitialized && (window as any).ffmpegInstance) {
      return;
    }

    // Create a script tag to load the FFmpeg scripts properly
    const ffmpegScript = document.createElement('script');
    ffmpegScript.src = `${basePath}/libs/ffmpeg/ffmpeg.min.js`;
    
    await new Promise<void>((resolve, reject) => {
      ffmpegScript.onload = async () => {
        try {
          // Create a new instance
          const { FFmpeg } = (window as any).FFmpegWASM;
          const ffmpeg = new FFmpeg();
          
          // Load the core
          await ffmpeg.load({
            coreURL: `${basePath}/libs/ffmpeg/ffmpeg-core.js`,
            wasmURL: `${basePath}/libs/ffmpeg/ffmpeg-core.wasm`,
          });
          
          // Store the initialized instance globally
          (window as any).ffmpegInstance = ffmpeg;
          (window as any).ffmpegInitialized = true;
          
          console.log('FFmpeg loaded successfully');
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      
      ffmpegScript.onerror = () => reject(new Error('Failed to load FFmpeg script'));
      document.head.appendChild(ffmpegScript);
    });
  } catch (error) {
    console.error('Failed to load FFmpeg:', error);
    throw error;
  }
}

/**
 * Async function to load JSZip library
 */
export async function loadJSZip(config: LibraryConfig = {}): Promise<void> {
  const basePath = config.basePath || getBasePath();
  
  try {
    await loadScript(`${basePath}/libs/jszip/jszip.min.js`);
    console.log('JSZip loaded successfully');
  } catch (error) {
    console.error('Failed to load JSZip:', error);
    throw error;
  }
}

/**
 * Load all libraries required for rendering
 */
export async function loadRenderingLibraries(config: LibraryConfig = {}): Promise<void> {
  try {
    await Promise.all([
      loadFFmpeg(config),
      loadJSZip(config)
    ]);
    console.log('All rendering libraries loaded successfully');
  } catch (error) {
    console.error('Failed to load rendering libraries:', error);
    throw error;
  }
}