// Animation primitives
import {EasingFunction} from "./easings.ts";
import {createPipeline, WebGLInitResult, WebGLPipeline} from "./webgl.ts";

/**
 * Interface defining the requirements for any Mation Scene
 * Developers can either extend the base Scene class or implement this interface
 * to create custom scenes compatible with the Mation library.
 */
export interface IScene {
  // Required properties
  canvas: HTMLCanvasElement;
  ctx: OffscreenCanvasRenderingContext2D;
  width: number;
  height: number;
  
  // Core animation methods
  setupLayers(): void;
  animationSequence(): Generator<Promise<void>, void, unknown>;
  
  // Animation control methods
  play(): void;
  pause(): void;
  playing(): boolean;
  seekToTime(time: number): void;
  loop(): boolean;
  
  // State getters
  getCurrentTime(): number;
  getDuration(): number;
  
  // Rendering methods
  queueRender(): void;
  renderAtTime(time: number): void;
  
  // Zoom and pan controls
  setZoom(value: number): void;
  setPan(value: [number, number]): void;
  setMousePosition(x: number, y: number): void;
  setPerformingPreviewAction(value: boolean): void;

  setTargetFPS(fps: number): void;
  getTargetFPS(): number;

  runSequence(): Promise<void>;
  get zoom(): number
  set zoom(value: number);
  get pan(): [number, number];
  set pan(value: [number, number]);
}

interface AnimationOptions {
  duration: number;
  easing?: EasingFunction;
  delay?: number;
  parallel?: boolean;
}

export interface DrawableExtras {
  layers: Record<string, Layer>;
}

export interface DrawableElement {
  draw(ctx: OffscreenCanvasRenderingContext2D, progress: number, extras: DrawableExtras): void;
  update?(progress: number): void;
  layer?: string | string[];
  segmentStartTime?: number; // Track when element was added
}

export type RenderHandler = (texture: WebGLTexture, progress: number, previewAction: boolean) => void;

export class Layer {
  public name: string;
  public x?: number;
  public y?: number;
  public width?: number;
  public height?: number;
  public isSubview?: boolean;
  public renderDuringPreviewAction?: boolean;
  public extras?: Record<string, any>;
  private pipeline: WebGLPipeline;
  public ignorePanZoom?: boolean;
  render: RenderHandler;

  constructor(
    name: string, 
    pipeline: WebGLPipeline,
    render: RenderHandler,
    options: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      isSubview?: boolean;
      renderDuringPreviewAction?: boolean;
      ignorePanZoom?: boolean;
      extras?: Record<string, any>;
    } = {}
  ) {
    this.name = name;
    this.pipeline = pipeline;
    this.render = render;
    this.x = options.x;
    this.y = options.y;
    this.width = options.width;
    this.height = options.height;
    this.isSubview = options.isSubview;
    this.renderDuringPreviewAction = options.renderDuringPreviewAction;
    this.ignorePanZoom = options.ignorePanZoom;
    this.extras = options.extras;
  }
  
  cleanup(): void {
    this.pipeline.w.cleanup();
  }
}

const defaultShader = {
  fragmentShader: `in vec2 vUv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform float u_progress;

void main() {
  fragColor = texture(u_texture, vUv);
}`,
  uniforms: {
    u_texture: null,
    u_progress: 0.0
  }
};

export interface AnimationSegment {
  startTime: number;
  duration: number;
  elements: DrawableElement[];
  easing: EasingFunction;
}

/**
 * Base Scene class that implements the IScene interface
 * This class provides the core implementation that handles animation,
 * rendering, and interactions. Users can extend this class to create their
 * own scenes.
 */
export class Scene implements IScene {
  canvas: HTMLCanvasElement;
  ctx: OffscreenCanvasRenderingContext2D;
  width: number;
  height: number;
  private _zoom: number = 1.0;
  private _pan: [number, number] = [0.0, 0.0];
  private mousePosition: [number, number] = [0, 0];
  
  get zoom(): number {
    return this._zoom;
  }
  
  set zoom(value: number) {
    this._zoom = value;
    this.savePlayerState();
  }
  
  get pan(): [number, number] {
    return this._pan;
  }
  
  set pan(value: [number, number]) {
    this._pan = value;
    this.savePlayerState();
  }
  
  setMousePosition(x: number, y: number): void {
    this.mousePosition = [x * window.devicePixelRatio, y * window.devicePixelRatio];
  }

  // Add debug logging to setZoom to see what's happening
  setZoom(value: number): void {
    // Get mouse position in screen space
    const [mouseX, mouseY] = this.mousePosition;

    // Calculate the world coordinates of the mouse point
    const worldX = (mouseX - this._pan[0]) / this._zoom;
    const worldY = (mouseY - this._pan[1]) / this._zoom;

    // Update the zoom level
    this._zoom = value;

    // Calculate new pan to keep the world point under the mouse cursor
    const newPanX = mouseX - worldX * this._zoom;
    const newPanY = mouseY - worldY * this._zoom;

    // Update pan values
    this._pan[0] = newPanX;
    this._pan[1] = newPanY;

    // this.setPerformingPreviewAction(true);
    // Queue render with updated transforms
    this.queueRender();
    this.savePlayerState();
  }
  
  setPan(value: [number, number]): void {
    this._pan = value;
    // Queue render with updated transforms
    this.queueRender();
    this.savePlayerState();
  }

  private animationId: number | null = null;
  private texturePipelineResult: WebGLInitResult;
  private layers: Layer[] = [];
  private layerLookup: Record<string, Layer> = {};
  private layerInitialProperties: Record<string, any> = {};
  private layerCanvases: Record<string, OffscreenCanvas> = {};
  private layerElements: Record<string, DrawableElement[]> = {};
  private defaultLayerElements: DrawableElement[] = [];
  private defaultLayerCanvas: OffscreenCanvas;
  private onFrame?: () => void;

  // WebGL texture cache
  private textureCache: Record<string, WebGLTexture> = {};
  
  // Animation timeline properties
  private animationSegments: AnimationSegment[] = [];
  private isPlaying: boolean = true;
  private currentTime: number = 0;
  private totalDuration: number = 0;
  private lastRenderTime: number = 0;
  private performingPreviewAction: boolean = false;
  private renderQueued: boolean = false;
  private targetFPS: number = 60;
  private frameInterval: number = (1000 / 60) / 1000; // 16.67ms for 60fps
  
  // State persistence key
  private static readonly PLAYER_STATE_KEY = 'mation_player_state';

  constructor({canvas, width, height}: {
    canvas: HTMLCanvasElement,
    width: number,
    height: number
  }) {
    this.canvas = canvas;
    this.canvas.width = width;
    this.canvas.height = height;
    this.width = width;
    this.height = height;
    const { ctx, texturePipelineResult, defaultLayerCanvas } = this.initialize();
    this.ctx = ctx;
    this.texturePipelineResult = texturePipelineResult;
    this.defaultLayerCanvas = defaultLayerCanvas;
  }

  initialize() {
    // Create a main drawing canvas
    const drawingCanvas = new OffscreenCanvas(this.width, this.height);
    drawingCanvas.width = this.width;
    drawingCanvas.height = this.height;
    const ctx = drawingCanvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    // Initialize the default pipeline with the default shader
    // This pipeline renders directly to the main canvas
    const defaultPipeline = createPipeline(this.canvas);
    this.texturePipelineResult = defaultPipeline.add(defaultShader);

    // Initialize default layer canvas
    this.defaultLayerCanvas = new OffscreenCanvas(this.canvas.width, this.canvas.height);

    this.setupLayers();
    
    // Try to restore player state from previous session
    this.restorePlayerState();

    return {
      ctx, texturePipelineResult: this.texturePipelineResult, defaultLayerCanvas: this.defaultLayerCanvas
    }
  }

  insertLayer(index: number, layer: Layer): void {
    // Store initial layer properties as a separate object
    this.layerInitialProperties[layer.name] = {
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      isSubview: layer.isSubview,
      renderDuringPreviewAction: layer.renderDuringPreviewAction,
      extras: layer.extras ? {...layer.extras} : undefined
    };
    
    this.layerLookup[layer.name] = layer;
    this.layers.splice(index, 0, layer);
    this.layerElements[layer.name] = [];
    const width = layer.width ?? this.canvas.width;
    const height = layer.height ?? this.canvas.height;
    this.layerCanvases[layer.name] = new OffscreenCanvas(width, height);
  }

  pushLayer(layer: Layer): void {
    // Store initial layer properties as a separate object
    this.layerInitialProperties[layer.name] = {
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      isSubview: layer.isSubview,
      renderDuringPreviewAction: layer.renderDuringPreviewAction,
      extras: layer.extras ? {...layer.extras} : undefined
    };
    
    this.layerLookup[layer.name] = layer;
    this.layers.push(layer);
    this.layerElements[layer.name] = [];
    this.layerCanvases[layer.name] = new OffscreenCanvas(
      this.canvas.width, this.canvas.height
    );
  }

  getLayer(layerName: string): Layer {
    return this.layerLookup[layerName];
  }

  registerElement(element: DrawableElement): void {
    if (element.layer) {
      if (Array.isArray(element.layer)) {
        // Register to multiple layers
        for (const layerName of element.layer) {
          if (this.layerLookup[layerName]) {
            this.layerElements[layerName].push(element);
          }
        }
      } else if (this.layerLookup[element.layer]) {
        // Register to a single layer
        this.layerElements[element.layer].push(element);
      } else {
        // Layer doesn't exist, add to default
        this.defaultLayerElements.push(element);
      }
    } else {
      // No layer specified, add to default
      this.defaultLayerElements.push(element);
    }
  }

  clear(): void {
    this.texturePipelineResult.renderer.cleanup();
    // Clean up any render targets from the pipeline that belong to this layer

    this.layers.forEach((layer) => {
      layer.cleanup();
    });

    // Only clear canvases, not the element collections
    const defaultCtx = this.defaultLayerCanvas.getContext('2d')!;
    defaultCtx.clearRect(0, 0, this.defaultLayerCanvas.width, this.defaultLayerCanvas.height);

    for (const layerName in this.layerCanvases) {
      const ctx = this.layerCanvases[layerName].getContext('2d')!;
      ctx.clearRect(0, 0, this.layerCanvases[layerName].width, this.layerCanvases[layerName].height);
    }
  }
  
  // Create or retrieve a cached texture for a canvas
  private getTextureForCanvas(canvas: OffscreenCanvas): WebGLTexture {
    const canvasKey = canvas === this.defaultLayerCanvas ? 'default' : canvas.toString();
    
    if (!this.textureCache[canvasKey]) {
      // Create a new texture if one doesn't exist
      this.textureCache[canvasKey] = this.texturePipelineResult.renderer.createTextureFromCanvas(canvas);
    } else {
      // Update the existing texture with new canvas content
      const gl = this.texturePipelineResult.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.textureCache[canvasKey]);
      // Tell WebGL to flip the Y axis when unpacking the texture
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      // Reset the pixel store parameter to its default
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    }
    
    return this.textureCache[canvasKey];
  }
  
  // Method to clear all elements and reset
  reset(): void {
    this.clear();
    this.animationSegments = [];
    this.defaultLayerElements = [];
    
    // Clean up any layer-specific WebGL resources
    for (const layerName in this.layerElements) {
      const layer = this.layerLookup[layerName];
      if (layer) {
        layer.cleanup();
      }
      this.layerElements[layerName] = [];
    }
    
    this.setCurrentTime(0);
    this.totalDuration = 0;
    
    // Clean up WebGL texture cache
    const gl = this.texturePipelineResult.gl;
    for (const key in this.textureCache) {
      gl.deleteTexture(this.textureCache[key]);
    }
    this.textureCache = {};
    
    // Clear saved player state
    this.clearPlayerState();
  }
  
  // Player state persistence methods
  private savePlayerState(): void {
    // Check if state caching is enabled via Mation options
    if (!(window as any).mation?.options?.cacheState) {
      return; // Skip saving state if caching is disabled
    }
    
    const state = {
      currentTime: this.currentTime,
      isPlaying: this.isPlaying,
      totalDuration: this.totalDuration,
      zoom: this._zoom,
      pan: this._pan
    };
    try {
      localStorage.setItem(Scene.PLAYER_STATE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save player state:', e);
    }
  }
  
  private restorePlayerState(): void {
    // Check if state caching is enabled via Mation options
    if (!(window as any).mation?.options?.cacheState) {
      return; // Skip restoring state if caching is disabled
    }
    
    try {
      const savedState = localStorage.getItem(Scene.PLAYER_STATE_KEY);
      if (savedState) {
        const state = JSON.parse(savedState);
        console.log('Found saved state:', state);
        
        // Store the values but don't apply the time yet - we need to wait until the animation
        // is fully loaded to validate these values against the new timeline
        
        // Explicitly set isPlaying state - important to match UI state
        // Only restore if autoplay isn't explicitly set
        if (state.isPlaying !== undefined && !(window as any).mation?.options?.autoplay) {
          this.isPlaying = state.isPlaying;
          console.log(`Restored playing state: ${this.isPlaying}`);
        }
        
        // Store current time but don't apply until timeline is built
        // It will be applied in runSequence() after buildAnimationTimeline()
        if (state.currentTime !== undefined) {
          this.setCurrentTime(state.currentTime);
          console.log(`Stored time for later restoration: ${this.currentTime}`);
        }
        
        // Restore zoom and pan state
        if (state.zoom !== undefined) {
          this._zoom = state.zoom;
          console.log(`Restored zoom: ${this._zoom}`);
        }
        
        if (state.pan !== undefined) {
          this._pan = state.pan;
          console.log(`Restored pan: ${this._pan}`);
        }
      } else {
        console.log('No saved player state found');
      }
    } catch (e) {
      console.warn('Failed to restore player state:', e);
    }
  }
  
  private clearPlayerState(): void {
    // Check if state caching is enabled via Mation options
    if (!(window as any).mation?.options?.cacheState) {
      return; // Skip clearing state if caching is disabled
    }
    
    try {
      localStorage.removeItem(Scene.PLAYER_STATE_KEY);
    } catch (e) {
      console.warn('Failed to clear player state:', e);
    }
  }

  apply(fn: (ctx: OffscreenCanvasRenderingContext2D) => void) {
    fn(this.ctx);
  }
  
  setCurrentTime(time: number): void {
    this.currentTime = time;
  }

  /**
   * Setup layers for the scene
   * This method can be implemented by any Scene subclass to define the layers
   * used in the animation.
   */
  setupLayers(): void {}

  /**
   * Define the animation sequence
   * This generator function must be implemented by any Scene subclass to create
   * the animation timeline.
   * Use yield this.animate(...) to create animation segments.
   * @example
   * *animationSequence() {
   *   yield this.animate([myElement], { duration: 1.0 });
   * }
   */
  *animationSequence(): Generator<Promise<void>, void, unknown> {
    // Must be implemented by subclass
    throw new Error('animationSequence() must be implemented by Scene subclass');
  }

  // Method to run a sequence of animations and build the timeline
  async runSequence(): Promise<void> {
    this.clear();
    
    // Store old state to restore later
    const oldDuration = this.totalDuration;
    const oldTime = this.currentTime;
    const wasPlaying = this.isPlaying;
    
    // Temporarily reset timeline state to build it
    const tempCurrentTime = this.currentTime;
    this.setCurrentTime(0);
    this.totalDuration = 0;
    this.animationSegments = [];
    this.lastRenderTime = 0;
    
    // First run the sequence to collect all segments and calculate total duration
    await this.buildAnimationTimeline();
    
    // Now restore the previous state with validation for new timeline
    if (oldTime > 0 || tempCurrentTime > 0) {
      // Use the larger of stored time or previous current time
      const timeToRestore = Math.max(oldTime, tempCurrentTime);
      
      // If duration changed and time is beyond new duration, reset to start or end
      // Otherwise, restore the previous time position
      if (oldDuration !== this.totalDuration && timeToRestore > this.totalDuration) {
        // If we were at the end, stay at the end, otherwise go to start
        this.setCurrentTime((timeToRestore >= oldDuration) ? this.totalDuration : 0);
      } else {
        this.setCurrentTime(Math.min(timeToRestore, this.totalDuration));
      }
    }
    
    // Restore play state
    this.isPlaying = wasPlaying;
    
    // Force a render at the current time to show the correct frame
    this.renderAtTime(this.currentTime);
    
    // Only start the animation loop if actually playing
    if (this.isPlaying) {
      this.lastRenderTime = performance.now();
      this.startAnimationLoop();
    }
    
    // Save the state after restoration
    this.savePlayerState();
    
    return Promise.resolve();
  }
  
  // Build timeline by running through the animation sequence once
  private async buildAnimationTimeline(): Promise<void> {
    this.ctx.save();
    const sequence = this.animationSequence();
    let result = sequence.next();

    while (!result.done) {
      // Just collect the segments but don't render anything yet
      await result.value;
      result = sequence.next();
    }
    
    this.ctx.restore();
    console.log(`Animation timeline built with ${this.animationSegments.length} segments, total duration: ${this.totalDuration}s`);
  }
  
  // Animation control methods
  play(): void {
    if (!this.isPlaying) {
      // If we're at the end of the animation, loop back to start
      if (this.currentTime >= this.totalDuration) {
        this.setCurrentTime(0);
      }
      
      this.isPlaying = true;
      this.lastRenderTime = performance.now();
      this.startAnimationLoop();
      this.savePlayerState();
    }
  }
  
  pause(): void {
    if (this.isPlaying) {
      this.isPlaying = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      this.savePlayerState();
    }
  }

  playing(): boolean {
    return this.isPlaying;
  }
  
  loop(): boolean {
    return (window as any).mation?.loop || false;
  }
  
  togglePlayPause(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }
  
  getDuration(): number {
    return this.totalDuration;
  }
  
  getCurrentTime(): number {
    return this.currentTime;
  }
  
  // Queue a render request that will be processed at the target FPS
  queueRender(): void {
    // Always set renderQueued to true when queueRender is called
    this.renderQueued = true;
    
    // Start the render loop if it's not already running
    if (!this.animationId) {
      this.lastRenderTime = performance.now();  // Reset lastRenderTime to avoid jumps
      this.animationId = requestAnimationFrame(this.renderLoop);
    }
  }

  // Set the target FPS for rendering
  setTargetFPS(fps: number): void {
    this.targetFPS = Math.max(1, fps);
    this.frameInterval = (1000 / this.targetFPS) / 1000;
  }
  
  // Get the current target FPS
  getTargetFPS(): number {
    return this.targetFPS;
  }

  // Start the main animation loop
  private startAnimationLoop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    // Set renderQueued to true when playing to ensure continuous rendering
    this.renderQueued = true;
    
    // Start the render loop which will respect target FPS
    this.renderLoop();
  }
  
  // Main render loop that respects target FPS
  private renderLoop = (): void => {
    const now = performance.now();
    const elapsed = now - this.lastRenderTime;
    
    // Only render if enough time has passed (target FPS) or if we're just starting
    if (elapsed >= this.frameInterval || this.lastRenderTime === 0) {
      // Update the last render time regardless of what we're doing
      this.lastRenderTime = now;
      
      // Update time for playing animations
      if (this.isPlaying) {
        const deltaTime = elapsed / 1000; // Convert to seconds
        
        // Update current time with clamping to valid range
        const prevTime = this.currentTime;
        this.setCurrentTime(Math.min(this.currentTime + deltaTime, this.totalDuration));
        
        // Render at the current time
        this.renderAtTime(this.currentTime);
        
        // Save current player state
        this.savePlayerState();
        
        // Call onFrame callback if provided
        if (this.onFrame) {
          this.onFrame();
        }
        
        // Check if we reached the end of animation
        if (this.currentTime >= this.totalDuration) {
          // If looping is enabled from Mation, restart from beginning
          if ((window as any).mation?.loop) {
            this.setCurrentTime(0);
            // Keep playing
            this.isPlaying = true;
          } else {
            // Not looping, stop the animation
            this.isPlaying = false;
            
            // Ensure we render the final frame
            if (prevTime < this.totalDuration) {
              this.renderAtTime(this.totalDuration);
            }
          }
          
          // Save player state after stopping or looping
          this.savePlayerState();
        }
      } else if (this.renderQueued) {
        // If not playing but render is queued, render at current time
        this.renderAtTime(this.currentTime);
        // Reset renderQueued flag after rendering once
        this.renderQueued = false;
      }
    }
    
    // Always keep renderQueued true while playing
    if (this.isPlaying) {
      this.renderQueued = true;
    }
    
    // Continue the loop if playing or if render is queued
    if (this.isPlaying || this.renderQueued) {
      this.animationId = requestAnimationFrame(this.renderLoop);
    } else {
      this.animationId = null;
    }
  }
  
  // Render the animation at a specific time
  renderAtTime(time: number): void {
    // Clamp time to valid range
    const targetTime = Math.max(0, Math.min(time, this.totalDuration));
    this.setCurrentTime(targetTime);

    // Clear the canvas
    this.clear();
    
    // Find all segments that should be visible at this time
    // This includes any segment that started before or at the current time
    const visibleSegments = this.animationSegments.filter(segment => {
      return segment.startTime <= targetTime;
    });
    
    // Sort segments by start time to ensure proper rendering order
    visibleSegments.sort((a, b) => a.startTime - b.startTime);

    // Collect all visible elements and their progress values
    const visibleElements = new Map<DrawableElement, number>();
    
    // Process each visible segment to determine element progress
    for (const segment of visibleSegments) {
      const segmentElapsedTime = targetTime - segment.startTime;
      
      // If the segment has completed, use progress of 1.0 (fully rendered)
      // Otherwise calculate the appropriate progress value
      let progress;
      if (segmentElapsedTime >= segment.duration) {
        progress = 1.0; // Fully complete
      } else {
        progress = Math.max(0, Math.min(segmentElapsedTime / segment.duration, 1.0));
        // Apply easing to the progress
        progress = segment.easing(progress);
      }
      
      // Add each element with its progress value
      for (const element of segment.elements) {
        visibleElements.set(element, progress);
      }
    }
    
    // Now render all visible elements using the current element collections
    this.renderFrame(visibleElements);
  }
  
  // Method to seek to a specific time
  seekToTime(time: number): void {
    // Clamp time to valid range
    const targetTime = Math.max(0, Math.min(time, this.totalDuration));
    this.setCurrentTime(targetTime);
    
    // Update the last render time to avoid large time jumps when animation resumes
    this.lastRenderTime = performance.now();
    
    // Queue render at this time
    this.queueRender();
    
    // If we seek to the end, make sure isPlaying is false
    if (targetTime >= this.totalDuration) {
      this.isPlaying = false;
    }
    
    // Save the current state
    this.savePlayerState();
  }
  
  // Getter and setter for performingPreviewAction
  setPerformingPreviewAction(value: boolean): void {
    if (this.performingPreviewAction !== value) {
      this.performingPreviewAction = value;

      if (!this.performingPreviewAction) {
        // Queue re-render to apply the change
        this.queueRender();
      }
    }
  }
  
  getPerformingPreviewAction(): boolean {
    return this.performingPreviewAction;
  }

  // Core animation method - now updated to work with the timeline
  animate(elements: DrawableElement[], options: AnimationOptions) {
    // Get current time and calculate segment timing
    const startTime = this.currentTime;
    const delay = options.delay || 0;
    const segmentStartTime = startTime + delay;
    const duration = options.duration;

    // Associate each element with this segment's start time
    for (const element of elements) {
      element.segmentStartTime = segmentStartTime;
      this.registerElement(element);
    }

    // Create a new animation segment and add it to our timeline
    const segment: AnimationSegment = {
      startTime: segmentStartTime,
      duration: duration,
      elements: [...elements],
      easing: options.easing || ((t) => t) // Default to linear easing if not provided
    };

    // Add this segment to our timeline
    this.animationSegments.push(segment);

    // Update total duration
    this.totalDuration = Math.max(this.totalDuration, segmentStartTime + duration);

    if (!options?.parallel) {
      // Advance current time
      this.setCurrentTime(segmentStartTime + duration);
    }
  }

  private renderElement(element: DrawableElement, ctx: OffscreenCanvasRenderingContext2D, progress: number): void {
    if (element.update) element.update(progress);
    element.draw(ctx, progress, { layers: this.layerLookup });
  }

  private renderFrame(progressMap: Map<DrawableElement, number>): void {
    // We'll render each layer to its respective WebGL pipeline, then combine them with alpha blending
    const currentTime = this.currentTime;
    
    // First, render the default layer
    const defaultCtx = this.defaultLayerCanvas.getContext('2d')!;
    defaultCtx.clearRect(0, 0, this.defaultLayerCanvas.width, this.defaultLayerCanvas.height);
    defaultCtx.save();
    defaultCtx.translate(this.pan[0], this.pan[1]);
    defaultCtx.scale(this.zoom, this.zoom);

    Object.keys(this.layerInitialProperties).forEach((layerName: string) => {
      // Restore initial properties before rendering if they were changed by an animation
      const initialProps = this.layerInitialProperties[layerName];
      if (initialProps) {
        const layer = this.layerLookup[layerName];
        // Restore all initial properties
        Object.assign(layer, initialProps);
      }
    });

    // Only render elements that should be visible at current time
    for (const element of this.defaultLayerElements) {
      // Skip elements that were added after the current time
      if (element.segmentStartTime !== undefined && element.segmentStartTime > currentTime) {
        continue;
      }
      
      // Get the progress for this element, defaulting to 1.0 for already-completed elements
      const elementProgress = progressMap.has(element) ? progressMap.get(element)! : 1.0;
      this.renderElement(element, defaultCtx, elementProgress);
    }
    
    // If performingPreviewAction is true, collect all elements from all layers and render them to default layer
    for (const layerName in this.layerElements) {
      const layer = this.layerLookup[layerName];
      if (this.performingPreviewAction && !layer.renderDuringPreviewAction) {
        const elements = this.layerElements[layerName];
        for (const element of elements) {
          // Skip elements that were added after the current time
          if (element.segmentStartTime !== undefined && element.segmentStartTime > currentTime) {
            continue;
          }

          // Get the progress for this element, defaulting to 1.0 for already-completed elements
          const elementProgress = progressMap.has(element) ? progressMap.get(element)! : 1.0;
          this.renderElement(element, defaultCtx, elementProgress);
        }
      }
    }

    // Process the default layer with its shader pipeline - use cached texture
    const defaultTexture = this.getTextureForCanvas(this.defaultLayerCanvas);
    this.texturePipelineResult.stage.set({
      u_texture: defaultTexture,
      u_progress: 1.0 // Always use full blending
    });
    
    // Render directly to the screen
    this.texturePipelineResult.renderer.setRenderTarget(null);
    
    // Make sure scissor test is disabled for the default layer
    const gl = this.texturePipelineResult.gl;
    gl.disable(gl.SCISSOR_TEST);

    this.texturePipelineResult.render();
    
    // Now render each additional layer in order, but only if not forcing default layer only
    for (const layer of this.layers) {
      if (!this.performingPreviewAction || layer.renderDuringPreviewAction) {
        const layerCanvas = this.layerCanvases[layer.name];
        const ctx = layerCanvas.getContext('2d')!;
        ctx.clearRect(0, 0, layerCanvas.width, layerCanvas.height);
        ctx.save();
        const zoom = this.zoom;
        const pan = this.pan;

        // Apply transformations based on whether this is a subview or not
        const x = (layer.x ?? 0) * zoom + pan[0];
        const y = (layer.y ?? 0) * zoom + pan[1];
        const width = (layer.width ?? layerCanvas.width) * zoom;
        const height = (layer.height ?? layerCanvas.height) * zoom;

        // For non-subview mode, also adjust the viewport to scale the full texture into the target area
        if (!layer.isSubview) {
          const scaleX = width / (this.canvas.width);
          const scaleY = height / (this.canvas.height);
          ctx.translate(x, y);
          ctx.scale(scaleX, scaleY);
        } else {
          ctx.translate(pan[0], pan[1]);
          ctx.scale(zoom, zoom);
        }

        // Draw all elements assigned to this layer that should be visible
        const elements = this.layerElements[layer.name];
        for (const element of elements) {
          // Skip elements that were added after the current time
          if (element.segmentStartTime !== undefined && element.segmentStartTime > currentTime) {
            continue;
          }

          // Get the progress for this element, defaulting to 1.0 for already-completed elements
          const elementProgress = progressMap.has(element) ? progressMap.get(element)! : 1.0;
          this.renderElement(element, ctx, elementProgress);
        }
        ctx.restore();

        // Process with the layer's shader pipeline - use cached texture
        const texture = this.getTextureForCanvas(layerCanvas);

        // Enable blending for transparent layers
        const gl = this.texturePipelineResult.gl;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // The scissor test is used regardless of mode to limit where rendering happens
        gl.enable(gl.SCISSOR_TEST);

        if (layer.ignorePanZoom) {
          gl.scissor(
            (layer.x ?? 0),
            (layer.y ?? 0),
            layer.width ?? layerCanvas.width,
            layer.height ?? layerCanvas.height,
          )
        } else {
          gl.scissor(
            x,
            this.canvas.height - y - height, // WebGL has origin at bottom left
            width,
            height
          );
        }

        layer.render(texture, 1.0, this.performingPreviewAction);

        // Disable blending and scissor test after rendering
        gl.disable(gl.BLEND);
        gl.disable(gl.SCISSOR_TEST);
      }
    }
    defaultCtx.restore();
  }
}
