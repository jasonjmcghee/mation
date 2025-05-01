# Mation

A powerful JavaScript animation and scene rendering library for creating animations with Canvas and WebGL.

## Features

- Create rich animated scenes using a simple interface
- Customizable WebGL effects with shader pipelines
- Frame-by-frame animation control with scrubbing
- Pan and zoom interaction
- Export to MP4 or PNG sequence

## Installation

```bash
npm install mation
```

## Basic Usage

### As a module in your JavaScript/TypeScript project

```javascript
import { Mation, Scene } from 'mation';

// Create a canvas element
const canvas = document.createElement('canvas');
canvas.width = 1920;
canvas.height = 1080;
document.getElementById('container').appendChild(canvas);

// Create a scene that extends the base Scene class
class MyScene extends Scene {
  setupLayers() {
    // Define your layers here
  }

  *animationSequence() {
    // Define your animation sequence here
    this.animate([{
      draw(ctx, progress) {
        // Draw something with the progress value
        ctx.fillStyle = `rgba(255, 0, 0, ${progress})`;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      }
    }], { duration: 1.0 });
  }
}

// Initialize Mation with your scene and options
const mation = new Mation({
  // Optional configuration
  enableRendering: true, // Set to false to hide the render button
  injectStyles: true,    // Set to false to manage styles yourself
  libraryConfig: {       // Configure paths to libraries
    ffmpegPath: '/libs/ffmpeg',
    jszipPath: '/libs/jszip'
  }
});

const scene = new MyScene({ canvas, width: 1920, height: 1080 });
mation.setScene(scene);
mation.initialize(document.getElementById('container'));

// When you're done with the Mation instance
// mation.destroy();
```

### Inline in HTML

You can also use Mation directly in HTML with an inline script:

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import { Mation, Scene } from 'mation';

    document.addEventListener('DOMContentLoaded', async () => {
      const app = document.querySelector("#preview");
      
      // Create canvas
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 450;
      app.append(canvas);
      
      // Create a minimal inline scene
      const scene = new Scene({ canvas, width: 800, height: 450 });
      
      // Override the required methods
      scene.setupLayers = function() {
        // No custom layers needed
      };

      scene.animationSequence = function*() {
        // Simple animation that draws a growing circle
        this.animate([{
          draw(ctx, progress) {
            // Clear the canvas
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 800, 450);
            
            // Draw a circle that grows with progress
            const radius = 50 + progress * 100;
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(400, 225, radius, 0, 2 * Math.PI);
            ctx.fill();
          }
        }], { duration: 2.0 });
      };

      // Initialize
      const mation = new Mation();
      mation.setScene(scene);
      await mation.initialize(app);
    });
  </script>
</head>
<body>
  <div id="preview"></div>
</body>
</html>
```

## Scene API

Your scene must implement these key methods:

### `setupLayers()`

Define any custom WebGL layers for advanced rendering effects.

### `*animationSequence()`

Generator function that defines your animation timeline using the `animate()` method.

## Examples

See the `examples` directory for more detailed examples:

- `inline-scene.html` - Simple animation with the Scene class
- `minimal-inline-scene.html` - Bare minimum implementation

## Advanced Usage

For advanced usage including WebGL shader pipelines, custom layers, and rendering options, please see the documentation and examples.

## License

MIT