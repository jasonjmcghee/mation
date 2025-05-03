/**
 * Mation CSS styles
 * This module contains the CSS styles for the Mation UI components
 */

export const styles = `
body {
  margin: 0;
  background: #181818;
}

/* Animation controls */
.animation-controls {
  position: absolute;
  bottom: 120px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  background: rgba(34, 34, 34, 0.7);
  padding: 10px;
  border-radius: 4px;
  width: 100%;
  max-width: 500px;
  z-index: 10;
}

.play-pause-button {
  background: #333;
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  margin-right: 10px;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-pause-button:hover {
  background: #444;
}

/* Reset zoom button positioned at bottom left */
.reset-zoom-button {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(34, 34, 34, 0.7);
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.reset-zoom-button:hover {
  background: rgba(51, 51, 51, 0.9);
}

.scrubber-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.right-controls-wrapper {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 5px;
}

.time-display {
  color: white;
  font-size: 12px;
  font-family: monospace;
  margin-right: 10px;
}

.loop-button {
  background: #333;
  border: none;
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease;
}

.loop-button:hover {
  background: #444;
}

.scrubber {
  width: 100%;
  cursor: pointer;
  height: 10px;
  -webkit-appearance: none;
  background: #333;
  border-radius: 5px;
  outline: none;
}

.scrubber::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: #3498db;
  border-radius: 50%;
  cursor: pointer;
}

.scrubber::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #3498db;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

/* Render dropdown and button */
.render-dropdown {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 10;
}

.button-container {
  display: flex;
  border-radius: 4px;
  overflow: hidden;
}

.render-button {
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px 0 0 4px;
  font-size: 16px;
  cursor: pointer;
  border-right: 1px solid rgba(255,255,255,0.2);
}

.render-button:hover {
  background-color: #2980b9;
}

.render-button:disabled {
  background-color: #666;
  cursor: not-allowed;
}

.dropdown-toggle {
  width: 30px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dropdown-toggle:hover {
  background-color: #2980b9;
}

.render-options {
  display: none;
  position: absolute;
  bottom: 45px;
  right: 0;
  width: 200px;
  background-color: #2c2c2c;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  overflow: hidden;
}

.render-options.visible {
  display: block;
}

.render-option {
  padding: 12px 16px;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.render-option:hover {
  background-color: #3a3a3a;
}

.render-option.selected {
  background-color: #1a1a1a;
  position: relative;
}

.render-option.selected:after {
  content: '✓';
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #3498db;
}

.progress-container {
  position: absolute;
  bottom: 70px;
  right: 20px;
  width: 200px;
  height: 6px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.progress-container.visible {
  opacity: 1;
}

.progress-bar {
  height: 100%;
  width: 0%;
  background-color: #3498db;
  transition: width 0.1s linear;
}
`;

/**
 * Inject the Mation styles into the document
 */
export function injectStyles() {
  const styleEl = document.createElement('style');
  styleEl.id = 'mation-styles';
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
}

/**
 * Remove the Mation styles from the document
 */
export function removeStyles() {
  const styleEl = document.getElementById('mation-styles');
  if (styleEl) {
    styleEl.remove();
  }
}