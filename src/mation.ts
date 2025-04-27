import {Scene} from "./animation.ts";
import {renderToVideo} from "./videoRenderer.ts";

export default class Mation {
  scene?: Scene;
  private playPauseButton: HTMLButtonElement | null = null;
  private scrubber: HTMLInputElement | null = null;
  private timeDisplay: HTMLElement | null = null;
  private renderButton: HTMLButtonElement | null = null;
  private progressContainer: HTMLElement | null = null;
  private progressBar: HTMLElement | null = null;
  private isPlaying = true;
  private isDragging = false;
  private wasPlayingBeforeDrag = false;
  private isRendering = false;

  constructor() {}

  setScene(scene: Scene) {
    this.scene = scene;
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
    (window as any).render = async () => {
      if (this.scene) {
        await renderToVideo(this.scene);
      } else {
        console.error("No scene available to render");
      }
    };
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
    
    // Create and add render button
    this.renderButton = document.createElement('button');
    this.renderButton.className = 'render-button';
    this.renderButton.textContent = 'Render Video';
    container.appendChild(this.renderButton);
    
    // Create progress container
    this.progressContainer = document.createElement('div');
    this.progressContainer.className = 'progress-container';
    container.appendChild(this.progressContainer);
    
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'progress-bar';
    this.progressContainer.appendChild(this.progressBar);
    
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

    // Scrubber handlers
    this.scrubber?.addEventListener('mousedown', () => {
      if (!this.scene) return;
      this.isDragging = true;
      this.wasPlayingBeforeDrag = this.isPlaying;
      this.scene.pause();
      
      // Enable default layer only mode while dragging
      this.scene.setForceDefaultLayerOnly(true);
    });

    this.scrubber?.addEventListener('touchstart', () => {
      if (!this.scene) return;
      this.isDragging = true;
      this.wasPlayingBeforeDrag = this.isPlaying;
      this.scene.pause();
      
      // Enable default layer only mode while dragging
      this.scene.setForceDefaultLayerOnly(true);
    });

    document.addEventListener('mouseup', () => {
      if (!this.scene) return;
      if (this.isDragging) {
        this.isDragging = false;
        
        // Disable default layer only mode when done dragging
        this.scene.setForceDefaultLayerOnly(false);
        
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
        this.scene.setForceDefaultLayerOnly(false);
        
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

    // Render button handling
    this.renderButton?.addEventListener('click', async () => {
      if (!this.scene || this.isRendering || !this.renderButton || !this.progressContainer || !this.progressBar) return;

      this.isRendering = true;
      this.renderButton.disabled = true;
      this.renderButton.textContent = 'Rendering...';
      this.progressContainer.classList.add('visible');
      this.progressBar.style.width = '0%';

      try {
        await renderToVideo(this.scene, {
          onProgress: (progress) => {
            if (this.progressBar) this.progressBar.style.width = `${progress * 100}%`;
          }
        });

        // Success
        if (this.renderButton) this.renderButton.textContent = 'Render Complete!';
        setTimeout(() => {
          if (this.renderButton) {
            this.renderButton.textContent = 'Render Video';
            this.renderButton.disabled = false;
          }
          if (this.progressContainer) this.progressContainer.classList.remove('visible');
        }, 3000);
      } catch (error) {
        console.error('Rendering failed:', error);
        if (this.renderButton) this.renderButton.textContent = 'Render Failed';
        setTimeout(() => {
          if (this.renderButton) {
            this.renderButton.textContent = 'Render Video';
            this.renderButton.disabled = false;
          }
          if (this.progressContainer) this.progressContainer.classList.remove('visible');
        }, 3000);
      }

      this.isRendering = false;
    });
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