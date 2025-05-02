import { IScene } from "./animation.ts";
import { renderToVideo, OutputFormat, getAvailableFormats } from "./videoRenderer.ts";
import { injectStyles, removeStyles } from "./styles.ts";
import { LibraryConfig } from "./loaders.ts";

/**
 * Options for creating a new Mation instance
 */
export interface MationOptions {
  /** Whether to enable rendering controls */
  enableRendering?: boolean;
  /** Whether to inject styles automatically */
  injectStyles?: boolean;
  /** 
   * Configuration for external libraries.
   * By default, libraries are automatically loaded from the same location as the Mation script.
   */
  libraryConfig?: LibraryConfig;
}

/**
 * Mation - Main controller class for animation scenes
 * 
 * This class provides the UI and controls for playing, pausing, scrubbing,
 * and rendering animations. It works with any class that implements the IScene
 * interface.
 */
export default class Mation {
  scene?: IScene;
  private playPauseButton: HTMLButtonElement | null = null;
  private scrubber: HTMLInputElement | null = null;
  private timeDisplay: HTMLElement | null = null;
  private renderButton: HTMLButtonElement | null = null;
  private renderDropdown: HTMLDivElement | null = null;
  private renderOptions: HTMLDivElement | null = null;
  private dropdownToggle: HTMLButtonElement | null = null;
  private selectedFormat: OutputFormat = 'mp4';
  private progressContainer: HTMLElement | null = null;
  private progressBar: HTMLElement | null = null;
  private isPlaying = true;
  private isDragging = false;
  private wasPlayingBeforeDrag = false;
  private isRendering = false;
  private options: MationOptions;

  constructor(options: MationOptions = {}) {
    this.options = {
      enableRendering: true,
      injectStyles: true,
      ...options
    };
    
    // Inject styles if requested
    if (this.options.injectStyles) {
      injectStyles();
    }
  }

  /**
   * Set the scene to be controlled by this Mation instance
   * @param scene Any object implementing the IScene interface
   */
  setScene(scene: IScene) {
    this.scene = scene;
  }

  setZoom(scene: IScene, zoom: number) {
    scene.setZoom(zoom);
  }

  setPan(scene: IScene, pan: [number, number]) {
    scene.setPan(pan);
  }

  getZoom(scene: IScene) {
    return (scene as any).zoom;
  }

  getPan(scene: IScene) {
    return (scene as any).pan;
  }
  
  setTargetFPS(fps: number) {
    if (this.scene) {
      this.scene.setTargetFPS(fps);
    }
  }
  
  queueRender() {
    if (this.scene) {
      this.scene.queueRender();
    }
  }

  async initialize(container: Element) {
    // If we have a scene already, set up the canvas for it
    if (!this.scene) {
      throw Error("Can't initialize without a scene.");
    }

    // Set up the UI controls
    this.setupControls(container);
    
    // Run the animation sequence to build the timeline
    if (this.scene) {
      await this.scene.runSequence();
      
      // Initialize duration once animation is loaded
      const duration = this.scene.getDuration();
      const currentTime = this.scene.getCurrentTime();
      
      // Update time display with the current position
      this.updateTimeDisplay(currentTime, duration);
      
      // Make sure isPlaying state is reflected in the button
      this.isPlaying = this.scene.playing();
      if (this.playPauseButton) {
        this.playPauseButton.textContent = this.isPlaying ? '⏸️' : '▶️';
      }
    }
    
    // Start updating the scrubber
    this.updateScrubber();
    
    // Expose for debugging
    (window as any).mation = this;
    (window as any).render = async (format: OutputFormat = 'mp4') => {
      if (this.scene) {
        await renderToVideo(this.scene, { 
          outputFormat: format,
          libraryConfig: this.options.libraryConfig 
        });
      } else {
        console.error("No scene available to render");
      }
    };
    (window as any).setTargetFPS = (fps: number) => {
      if (this.scene) {
        this.scene.setTargetFPS(fps);
        console.log(`Target FPS set to ${fps}`);
      }
    };
  }
  
  /**
   * Clean up and destroy the Mation instance
   * Call this when you're done with the Mation instance to clean up resources
   */
  destroy() {
    // Pause any ongoing animation
    if (this.scene) {
      this.scene.pause();
    }
    
    // Remove styles if they were injected
    if (this.options.injectStyles) {
      removeStyles();
    }
    
    // Remove global references
    if ((window as any).mation === this) {
      delete (window as any).mation;
      delete (window as any).render;
      delete (window as any).setTargetFPS;
    }
  }

  private setupControls(container: Element) {
    // Create animation controls
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'animation-controls';
    container.appendChild(controlsContainer);
    
    // Play/Pause button
    this.playPauseButton = document.createElement('button');
    this.playPauseButton.className = 'play-pause-button';
    this.playPauseButton.textContent = '⏸️';
    controlsContainer.appendChild(this.playPauseButton);
    
    // Reset Zoom button (positioned at bottom left, outside player controls)
    const resetZoomButton = document.createElement('button');
    resetZoomButton.className = 'reset-zoom-button';
    resetZoomButton.textContent = '🔍';
    resetZoomButton.title = 'Reset Zoom';
    container.appendChild(resetZoomButton);
    
    // Scrubber/slider container
    const scrubberContainer = document.createElement('div');
    scrubberContainer.className = 'scrubber-container';
    controlsContainer.appendChild(scrubberContainer);
    
    // Time display
    this.timeDisplay = document.createElement('div');
    this.timeDisplay.className = 'time-display';
    this.timeDisplay.textContent = '0.00 / 0.00';
    scrubberContainer.appendChild(this.timeDisplay);
    
    // Scrubber input
    this.scrubber = document.createElement('input');
    this.scrubber.type = 'range';
    this.scrubber.min = '0';
    this.scrubber.max = '1000'; // We'll use 1000 steps for precision
    this.scrubber.value = '0';
    this.scrubber.className = 'scrubber';
    scrubberContainer.appendChild(this.scrubber);
    
    // Only add rendering controls if enabled
    if (this.options.enableRendering) {
      // Create render dropdown container
      this.renderDropdown = document.createElement('div');
      this.renderDropdown.className = 'render-dropdown';
      container.appendChild(this.renderDropdown);
      
      // Create button container (holds both buttons)
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'button-container';
      this.renderDropdown.appendChild(buttonContainer);
      
      // Create and add render button
      this.renderButton = document.createElement('button');
      this.renderButton.className = 'render-button';
      this.renderButton.textContent = 'Render MP4';
      buttonContainer.appendChild(this.renderButton);
      
      // Create dropdown toggle button
      this.dropdownToggle = document.createElement('button');
      this.dropdownToggle.className = 'dropdown-toggle';
      this.dropdownToggle.innerHTML = '▼';
      buttonContainer.appendChild(this.dropdownToggle);
      
      // Create render options dropdown
      this.renderOptions = document.createElement('div');
      this.renderOptions.className = 'render-options';
      this.renderDropdown.appendChild(this.renderOptions);
      
      // Get available formats
      const availableFormats = getAvailableFormats();
      
      // Add MP4 option
      const mp4Option = document.createElement('div');
      mp4Option.className = 'render-option selected';
      mp4Option.textContent = 'MP4 Video';
      mp4Option.dataset.format = 'mp4';
      this.renderOptions.appendChild(mp4Option);
      
      // Add ZIP option
      const zipOption = document.createElement('div');
      zipOption.className = 'render-option';
      zipOption.textContent = 'PNG Sequence (ZIP)';
      zipOption.dataset.format = 'zip';
      this.renderOptions.appendChild(zipOption);
      
      // Add Node MP4 option if available
      if (availableFormats.includes('node_mp4')) {
        const nodeOption = document.createElement('div');
        nodeOption.className = 'render-option';
        nodeOption.textContent = 'Server MP4 (faster)';
        nodeOption.dataset.format = 'node_mp4';
        this.renderOptions.appendChild(nodeOption);
      }
      
      // Create progress container
      this.progressContainer = document.createElement('div');
      this.progressContainer.className = 'progress-container';
      container.appendChild(this.progressContainer);
      
      this.progressBar = document.createElement('div');
      this.progressBar.className = 'progress-bar';
      this.progressContainer.appendChild(this.progressBar);
    }
    
    // Set up event listeners
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Play/Pause button handler
    this.playPauseButton?.addEventListener('click', () => {
      if (!this.scene) return;
      
      if (this.isPlaying) {
        // Pause the animation
        this.scene.pause();
        if (this.playPauseButton) this.playPauseButton.textContent = '▶️';
      } else {
        // If we're at the end of the animation, restart from beginning
        if (this.scene.getCurrentTime() >= this.scene.getDuration()) {
          this.scene.seekToTime(0);
        }
        // Play the animation
        this.scene.play();
        if (this.playPauseButton) this.playPauseButton.textContent = '⏸️';
      }
      this.isPlaying = !this.isPlaying;
    });
    
    // Reset zoom button handler
    const resetZoomButton = document.querySelector('.reset-zoom-button');
    resetZoomButton?.addEventListener('click', () => {
      if (!this.scene) return;
      
      // Reset to center of canvas
      const canvasWidth = this.scene.canvas.width;
      const canvasHeight = this.scene.canvas.height;
      this.scene.setMousePosition(canvasWidth / 2, canvasHeight / 2);
      
      // Reset zoom to 1.0
      this.scene.setZoom(1.0);
      
      // Reset pan to [0, 0]
      this.scene.setPan([0, 0]);

      this.scene.setPerformingPreviewAction(false);
    });

    // Scrubber handlers
    this.scrubber?.addEventListener('mousedown', () => {
      if (!this.scene) return;
      this.isDragging = true;
      this.wasPlayingBeforeDrag = this.isPlaying;
      this.scene.pause();
      
      // Enable default layer only mode while dragging
      this.scene.setPerformingPreviewAction(true);
    });

    this.scrubber?.addEventListener('touchstart', () => {
      if (!this.scene) return;
      this.isDragging = true;
      this.wasPlayingBeforeDrag = this.isPlaying;
      this.scene.pause();
      
      // Enable default layer only mode while dragging
      this.scene.setPerformingPreviewAction(true);
    });

    // These must remain on document to catch events outside the canvas
    document.addEventListener('mouseup', () => {
      if (!this.scene) return;
      if (this.isDragging) {
        this.isDragging = false;

        // Disable default layer only mode when done dragging
        this.scene.setPerformingPreviewAction(false);

        if (this.wasPlayingBeforeDrag) {
          this.scene.play();
          this.isPlaying = true;
          if (this.playPauseButton) this.playPauseButton.textContent = '⏸️';
        }
      }
    });

    document.addEventListener('touchend', () => {
      if (!this.scene) return;
      if (this.isDragging) {
        this.isDragging = false;
        
        // Disable default layer only mode when done dragging
        this.scene.setPerformingPreviewAction(false);

        if (this.wasPlayingBeforeDrag) {
          this.scene.play();
          this.isPlaying = true;
          if (this.playPauseButton) this.playPauseButton.textContent = '⏸️';
        }
      }
    });

    this.scrubber?.addEventListener('input', () => {
      if (!this.scene || !this.scrubber) return;
      const value = parseInt(this.scrubber.value, 10);
      const duration = this.scene.getDuration();
      const targetTime = (value / 1000) * duration;
      this.scene.seekToTime(targetTime);
      this.updateTimeDisplay(targetTime, duration);
    });
    
    // Track mouse position for zooming
    this.scene?.canvas?.addEventListener('mousemove', (event) => {
      if (!this.scene || !this.scene.canvas) return;
      
      // Get mouse position relative to canvas
      const rect = this.scene.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Update the mouse position in the scene
      this.scene.setMousePosition(x, y);
    });

    // Zoom with mouse wheel
    let wheelTimeout: number | null = null;
    
    this.scene?.canvas?.addEventListener('wheel', (event) => {
      if (!this.scene) return;

      // Prevent default behavior to avoid page scrolling
      event.preventDefault();

      // Get mouse position relative to canvas
      const rect = this.scene.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // First, update the mouse position
      this.scene.setMousePosition(x, y);

      // Get current zoom
      const currentZoom = this.scene.zoom;

      // Calculate new zoom based on wheel direction
      let newZoom;
      if (event.deltaY > 0) {
        // Zoom out - use smaller steps for smoother experience
        newZoom = Math.max(0.05, currentZoom / 1.1);
      } else {
        // Zoom in - use smaller steps for smoother experience
        newZoom = Math.min(10, currentZoom * 1.1);
      }

      // Apply the new zoom - this will use queueRender internally
      this.scene.setZoom(newZoom);

      // Enable force default layer only while zooming
      this.scene.setPerformingPreviewAction(true);
      
      // Clear any existing timeout
      if (wheelTimeout !== null) {
        clearTimeout(wheelTimeout);
      }
      
      // Set a new timeout to detect when zooming stops
      wheelTimeout = window.setTimeout(() => {
        // Set force default layer to false when zooming stops
        if (this.scene) {
          this.scene.setPerformingPreviewAction(false);
        }
        wheelTimeout = null;
      }, 200); // 200ms debounce time
    }, { passive: false });
    
    // Pan with Alt + mouse drag
    let isPanning = false;
    let lastX = 0;
    let lastY = 0;

    this.scene?.canvas?.addEventListener('mousedown', (event) => {
      if (!this.scene) return;

      // Only start panning if Alt key is pressed
      if (event.altKey) {
        this.scene.setPerformingPreviewAction(true);
        isPanning = true;
        lastX = event.clientX;
        lastY = event.clientY;
      }
    });

    this.scene?.canvas?.addEventListener('mousemove', (event) => {
      if (!this.scene || !isPanning) return;
      
      const deltaX = event.clientX - lastX;
      const deltaY = event.clientY - lastY;
      
      // Update pan values - this will use queueRender internally
      const [currentX, currentY] = this.scene.pan;
      this.scene.setPan([currentX + deltaX, currentY + deltaY]);

      lastX = event.clientX;
      lastY = event.clientY;
    });
    
    this.scene?.canvas?.addEventListener('mouseup', () => {
      isPanning = false;
      this.scene?.setPerformingPreviewAction(false);
    });
    
    // Touch-based panning with two fingers
    let touchStartDistance = 0;
    let initialZoom = 1;
    let touchStartX = 0;
    let touchStartY = 0;
    
    this.scene?.canvas?.addEventListener('touchstart', (event) => {
      if (!this.scene) return;
      
      if (event.touches.length === 2) {
        // Two-finger gesture started - handle zoom and pan
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        // Calculate distance between touches for zoom
        touchStartDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        
        initialZoom = this.scene.zoom;
        
        // Calculate midpoint for pan
        touchStartX = (touch1.clientX + touch2.clientX) / 2;
        touchStartY = (touch1.clientY + touch2.clientY) / 2;
      }
    });
    
    this.scene?.canvas?.addEventListener('touchmove', (event) => {
      if (!this.scene) return;
      
      if (event.touches.length === 2) {
        // Prevent default to avoid page gestures
        event.preventDefault();
        
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        // Handle zoom - calculate new distance
        const currentDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        
        // Calculate midpoint for zoom center
        const currentMidX = (touch1.clientX + touch2.clientX) / 2;
        const currentMidY = (touch1.clientY + touch2.clientY) / 2;
        
        // Get canvas position
        const rect = this.scene.canvas.getBoundingClientRect();
        const canvasX = currentMidX - rect.left;
        const canvasY = currentMidY - rect.top;
        
        // Update mouse position for zoom centering
        this.scene.setMousePosition(canvasX, canvasY);
        
        // Calculate zoom ratio
        const zoomDelta = currentDistance / touchStartDistance;
        this.scene.setZoom(initialZoom * zoomDelta);
        
        // Handle pan - calculate midpoint movement
        const deltaX = currentMidX - touchStartX;
        const deltaY = currentMidY - touchStartY;
        
        const [startX, startY] = this.scene.pan;
        this.scene.setPan([startX + deltaX, startY + deltaY]);
        
        // Update start position for next move
        touchStartX = currentMidX;
        touchStartY = currentMidY;
      }
    }, { passive: false });

    // Only set up rendering-related event listeners if rendering is enabled
    if (this.options.enableRendering) {
      // Dropdown toggle button
      this.dropdownToggle?.addEventListener('click', () => {
        if (this.isRendering) return;
        
        if (this.renderOptions) {
          this.renderOptions.classList.toggle('visible');
        }
      });
      
      // Render option selection
      this.renderOptions?.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        if (target.classList.contains('render-option')) {
          // Update selected format
          const format = target.dataset.format as OutputFormat;
          this.selectedFormat = format;
          
          // Update UI
          const options = this.renderOptions?.querySelectorAll('.render-option');
          options?.forEach(option => option.classList.remove('selected'));
          target.classList.add('selected');
          
          // Update button text
          if (this.renderButton) {
            if (format === 'mp4') {
              this.renderButton.textContent = 'Render MP4';
            } else if (format === 'zip') {
              this.renderButton.textContent = 'Render PNGs';
            } else if (format === 'node_mp4') {
              this.renderButton.textContent = 'Render Server MP4';
            }
          }
          
          // Hide dropdown
          this.renderOptions?.classList.remove('visible');
        }
      });
      
      // Close dropdown when clicking elsewhere
      document.addEventListener('click', (event) => {
        if (this.renderOptions?.classList.contains('visible') && 
            this.dropdownToggle && 
            !(event.target === this.dropdownToggle || this.dropdownToggle.contains(event.target as Node)) &&
            !(event.target === this.renderOptions || this.renderOptions.contains(event.target as Node))) {
          this.renderOptions.classList.remove('visible');
        }
      });
      
      // Start rendering with main button
      this.renderButton?.addEventListener('click', async () => {
        if (!this.scene || this.isRendering || !this.renderButton || !this.progressContainer || !this.progressBar) return;

        // Hide dropdown if visible
        if (this.renderOptions?.classList.contains('visible')) {
          this.renderOptions.classList.remove('visible');
        }

        this.isRendering = true;
        this.renderButton.disabled = true;
        this.renderButton.textContent = 'Rendering...';
        this.progressContainer.classList.add('visible');
        this.progressBar.style.width = '0%';

        try {
          await renderToVideo(this.scene, {
            onProgress: (progress) => {
              if (this.progressBar) this.progressBar.style.width = `${progress * 100}%`;
            },
            outputFormat: this.selectedFormat,
            libraryConfig: this.options.libraryConfig
          });

          // Success
          if (this.renderButton) this.renderButton.textContent = 'Render Complete!';
          setTimeout(() => {
            if (this.renderButton) {
              if (this.selectedFormat === 'mp4') {
                this.renderButton.textContent = 'Render MP4';
              } else if (this.selectedFormat === 'zip') {
                this.renderButton.textContent = 'Render PNGs';
              } else if (this.selectedFormat === 'node_mp4') {
                this.renderButton.textContent = 'Render Server MP4';
              }
              this.renderButton.disabled = false;
            }
            if (this.progressContainer) this.progressContainer.classList.remove('visible');
          }, 3000);
        } catch (error) {
          console.error('Rendering failed:', error);
          if (this.renderButton) this.renderButton.textContent = 'Render Failed';
          setTimeout(() => {
            if (this.renderButton) {
              if (this.selectedFormat === 'mp4') {
                this.renderButton.textContent = 'Render MP4';
              } else if (this.selectedFormat === 'zip') {
                this.renderButton.textContent = 'Render PNGs';
              } else if (this.selectedFormat === 'node_mp4') {
                this.renderButton.textContent = 'Render Server MP4';
              }
              this.renderButton.disabled = false;
            }
            if (this.progressContainer) this.progressContainer.classList.remove('visible');
          }, 3000);
        }

        this.isRendering = false;
      });
    }
  }

  private updateTimeDisplay(currentTime: number, totalDuration: number) {
    if (this.timeDisplay) {
      this.timeDisplay.textContent = `${currentTime.toFixed(2)}s / ${totalDuration.toFixed(2)}s`;
    }
  }

  private updateScrubber = () => {
    // Only update scrubber if we're not actively dragging it
    if (!this.isDragging && this.scrubber && this.scene) {
      const currentTime = this.scene.getCurrentTime();
      const totalDuration = this.scene.getDuration();

      if (totalDuration > 0) {
        // Update scrubber position
        const value = Math.min(Math.floor((currentTime / totalDuration) * 1000), 1000);
        this.scrubber.value = value.toString();

        // Update time display
        this.updateTimeDisplay(currentTime, totalDuration);

        // Check if animation has ended
        if (currentTime >= totalDuration && this.isPlaying) {
          this.isPlaying = false;
          if (this.playPauseButton) this.playPauseButton.textContent = '▶️';
        }
      }
    }

    requestAnimationFrame(this.updateScrubber);
  }
}