// Animation primitives
import {EasingFunction} from "./easings.ts";
import {buildWebGlPipeline, WebGLInitResult} from "./webgl.ts";

interface AnimationOptions {
  duration: number;
  easing?: EasingFunction;
  delay?: number;
}

export interface DrawableElement {
  draw(ctx: OffscreenCanvasRenderingContext2D, progress: number, extras: { layers: Record<string, Layer> }): void;
  update?(progress: number): void;
  layer?: string | string[];
  segmentStartTime?: number; // Track when element was added
}

export interface Layer {
  name: string;
  render: (texture: WebGLTexture, progress: number) => void;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  isSubview?: boolean;
  renderWhenScrubbing?: boolean;
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

export class Scene {
  canvas: HTMLCanvasElement;
  ctx: OffscreenCanvasRenderingContext2D;
  width: number;
  height: number;

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
  private forceDefaultLayerOnly: boolean = false;
  
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
    const defaultPipeline = buildWebGlPipeline(this.canvas);
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
    this.layerInitialProperties[layer.name] = {...layer};
    
    this.layerLookup[layer.name] = layer;
    this.layers.splice(index, 0, layer);
    this.layerElements[layer.name] = [];
    const width = layer.width ?? this.canvas.width;
    const height = layer.height ?? this.canvas.height;
    this.layerCanvases[layer.name] = new OffscreenCanvas(width, height);
  }

  pushLayer(layer: Layer): void {
    // Store initial layer properties as a separate object
    this.layerInitialProperties[layer.name] = {...layer};
    
    this.layerLookup[layer.name] = layer;
    this.layers.push(layer);
    this.layerElements[layer.name] = [];
    const width = this.canvas.width;
    const height = this.canvas.height;
    this.layerCanvases[layer.name] = new OffscreenCanvas(width, height);
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
    this.texturePipelineResult.renderer.clear();
    
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
    for (const layerName in this.layerElements) {
      this.layerElements[layerName] = [];
    }
    this.currentTime = 0;
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
    const state = {
      currentTime: this.currentTime,
      isPlaying: this.isPlaying,
      totalDuration: this.totalDuration
    };
    try {
      localStorage.setItem(Scene.PLAYER_STATE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save player state:', e);
    }
  }
  
  private restorePlayerState(): void {
    try {
      const savedState = localStorage.getItem(Scene.PLAYER_STATE_KEY);
      if (savedState) {
        const state = JSON.parse(savedState);
        console.log('Found saved state:', state);
        
        // Store the values but don't apply the time yet - we need to wait until the animation
        // is fully loaded to validate these values against the new timeline
        
        // Explicitly set isPlaying state - important to match UI state
        if (state.isPlaying !== undefined) {
          this.isPlaying = state.isPlaying;
          console.log(`Restored playing state: ${this.isPlaying}`);
        }
        
        // Store current time but don't apply until timeline is built
        // It will be applied in runSequence() after buildAnimationTimeline()
        if (state.currentTime !== undefined) {
          this.currentTime = state.currentTime;
          console.log(`Stored time for later restoration: ${this.currentTime}`);
        }
      } else {
        console.log('No saved player state found');
      }
    } catch (e) {
      console.warn('Failed to restore player state:', e);
    }
  }
  
  private clearPlayerState(): void {
    try {
      localStorage.removeItem(Scene.PLAYER_STATE_KEY);
    } catch (e) {
      console.warn('Failed to clear player state:', e);
    }
  }

  apply(fn: (ctx: OffscreenCanvasRenderingContext2D) => void) {
    fn(this.ctx);
  }

  setupLayers() {
    // Setup Layers function to be implemented by user
  }

  *animationSequence(): Generator<Promise<void>, void, unknown> {
    // Generator function to be implemented by the user
    // yield this.animate(...)
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
    this.currentTime = 0;
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
        this.currentTime = (timeToRestore >= oldDuration) ? this.totalDuration : 0;
      } else {
        this.currentTime = Math.min(timeToRestore, this.totalDuration);
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
        this.currentTime = 0;
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
  
  // Start the main animation loop
  private startAnimationLoop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    const animate = (timestamp: number) => {
      if (!this.isPlaying) return;
      
      const deltaTime = (timestamp - this.lastRenderTime) / 1000; // Convert to seconds
      this.lastRenderTime = timestamp;
      
      // Update current time with clamping to valid range
      const prevTime = this.currentTime;
      this.currentTime = Math.min(this.currentTime + deltaTime, this.totalDuration);
      
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
        // We reached the end, stop the animation
        this.isPlaying = false;
        
        // Ensure we render the final frame
        if (prevTime < this.totalDuration) {
          this.renderAtTime(this.totalDuration);
        }
        
        // Save player state after stopping
        this.savePlayerState();
        
        return; // Don't request another frame
      }
      
      // Continue animation
      this.animationId = requestAnimationFrame(animate);
    };
    
    this.lastRenderTime = performance.now();
    this.animationId = requestAnimationFrame(animate);
  }
  
  // Render the animation at a specific time
  renderAtTime(time: number): void {
    // Clamp time to valid range
    const targetTime = Math.max(0, Math.min(time, this.totalDuration));
    this.currentTime = targetTime;
    
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
    this.currentTime = targetTime;
    
    // Update the last render time to avoid large time jumps when animation resumes
    this.lastRenderTime = performance.now();
    
    // Render at this time
    this.renderAtTime(targetTime);
    
    // If we seek to the end, make sure isPlaying is false
    if (targetTime >= this.totalDuration) {
      this.isPlaying = false;
    }
    
    // Save the current state
    this.savePlayerState();
  }
  
  // Getter and setter for forceDefaultLayerOnly
  setForceDefaultLayerOnly(value: boolean): void {
    if (this.forceDefaultLayerOnly !== value) {
      this.forceDefaultLayerOnly = value;
      // Re-render at current time to apply the change
      this.renderAtTime(this.currentTime);
    }
  }
  
  getForceDefaultLayerOnly(): boolean {
    return this.forceDefaultLayerOnly;
  }

  // Core animation method - now updated to work with the timeline
  animate(elements: DrawableElement[], options: AnimationOptions): Promise<void> {
    return new Promise<void>((resolve) => {
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
      
      // Advance current time
      this.currentTime = segmentStartTime + duration;
      
      // Immediately resolve the promise
      resolve();
    });
  }

  // We don't need the startAnimation method any more as we're using the timeline-based approach

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
    
    // If forceDefaultLayerOnly is true, collect all elements from all layers and render them to default layer
    for (const layerName in this.layerElements) {
      const layer = this.layerLookup[layerName];
      if (this.forceDefaultLayerOnly && !layer.renderWhenScrubbing) {
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
    // gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    
    this.texturePipelineResult.render();
    
    // Now render each additional layer in order, but only if not forcing default layer only
    for (const layer of this.layers) {
      if (!this.forceDefaultLayerOnly || layer.renderWhenScrubbing) {
        const layerCanvas = this.layerCanvases[layer.name];
        const ctx = layerCanvas.getContext('2d')!;
        ctx.clearRect(0, 0, layerCanvas.width, layerCanvas.height);

        // Save context state before applying transforms
        ctx.save();

        // Apply transformations based on whether this is a subview or not
        const x = layer.x ?? 0;
        const y = layer.y ?? 0;
        const width = layer.width ?? this.canvas.width;
        const height = layer.height ?? this.canvas.height;

        // For non-subview mode, also adjust the viewport to scale the full texture into the target area
        if (!layer.isSubview) {
          const scaleX = width / layerCanvas.width;
          const scaleY = height / layerCanvas.height;
          ctx.translate(x, y);
          ctx.scale(scaleX, scaleY);
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

        // Restore context state after drawing
        ctx.restore();

        // Process with the layer's shader pipeline - use cached texture
        const texture = this.getTextureForCanvas(layerCanvas);

        // Enable blending for transparent layers
        const gl = this.texturePipelineResult.gl;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // The scissor test is used regardless of mode to limit where rendering happens
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(
          x,
          this.canvas.height - y - height, // WebGL has origin at bottom left
          width,
          height
        );

        layer.render(texture, 1.0); // Always use full blending

        // Disable blending and scissor test after rendering
        gl.disable(gl.BLEND);
        gl.disable(gl.SCISSOR_TEST);
      }
    }
  }
}