/**
 * Mation - Animation and Scene Rendering Library
 * Main entry point for the library
 */
// Export core animation components
export {Scene, Layer} from './animation.ts';
export type { DrawableElement, AnimationSegment } from './animation.ts';

// Export WebGL related components
export {buildWebGlPipeline, WebGLPipeline} from './webgl.ts';
export type { WebGLInitResult } from './webgl.ts';

// Export easing functions
export {Easing} from './easings.ts';
export type { EasingFunction } from './easings.ts';

// Export the main Mation class
export { default as Mation } from './mation.ts';
export type { MationOptions } from './mation.ts';

// Export the video renderer
export { renderToVideo, getAvailableFormats, type OutputFormat } from './videoRenderer.ts';

// Export styling utilities
export { injectStyles, removeStyles } from './styles.ts';

// Export library loaders
export { loadFFmpeg, loadJSZip, loadRenderingLibraries } from './loaders.ts';
export type { LibraryConfig } from './loaders.ts';

// Default export for simpler imports
import Mation from './mation.ts';
export default Mation;