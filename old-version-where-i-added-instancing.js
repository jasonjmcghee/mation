const prefix = `#version 300 es
precision highp float;
precision highp int;
`;

// Vertex Shader (shared by both passes)
const vertexShaderDefault = `layout(location = 0) in vec2 position;
layout(location = 1) in vec2 texCoord;
out vec2 vUv;
out vec2 v_texCoord;
void main() {
    v_texCoord = texCoord;
    vUv = 0.5 * (position + 1.0);
    gl_Position = vec4(position, 0.0, 1.0);
}`;

class Pass {
constructor(w, materialProperties) {
const {fragmentShader, vertexShader, uniforms, instanceAttributes, numInstances, name} = materialProperties;
this.vertexShader = vertexShader ?? vertexShaderDefault;
this.fragmentShader = fragmentShader;
this.program = w.createProgram(
`${prefix}${this.vertexShader}`,
`${prefix}${this.fragmentShader}`
);
this.uniforms = uniforms;
this.name = name;
w.programs.set(name, this.program);
this.w = w;
this.attributes = {
position: w.createArrayBuffer(
new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
2,
),
texCoord: w.createArrayBuffer(
new Float32Array([
0, 0,
1, 0,
0, 1,
1, 1
]),
2,
),
};
this.instanceAttributes = materialProperties.instanceAttributes || {};
this.numInstances = materialProperties.numInstances || 1;
this.isInstanced = !!materialProperties.instanceAttributes;
}

setInstanceAttribute(name, data, itemSize) {
const buffer = this.w.gl.createBuffer();
this.w.gl.bindBuffer(this.w.gl.ARRAY_BUFFER, buffer);
this.w.gl.bufferData(this.w.gl.ARRAY_BUFFER, data, this.w.gl.STATIC_DRAW);
this.instanceAttributes[name] = { buffer, itemSize };
}

updateShaders({vertexShader, fragmentShader}) {
this.vertexShader = vertexShader ?? this.vertexShader;
this.fragmentShader = fragmentShader ?? this.fragmentShader;
this.program = this.w.createProgram(
`${prefix}${this.vertexShader}`,
`${prefix}${this.fragmentShader}`
);
this.w.programs.set(this.name, this.program);
}

set(updates) {
Object.keys(updates).forEach((key) => {
this.uniforms[key] = updates[key];
});
}

render(overrides = {}) {
this.w.render(
this.name,
{
...this.uniforms,
...overrides
},
{
...this.attributes,
instanceAttributes: this.instanceAttributes,
numInstances: this.numInstances,
},
);
}
}

class Pipeline {
constructor(w) {
this.w = w;
this.passes = {};
}

createPass(materialProperties) {
const {name, instanceAttributes, numInstances} = materialProperties;
const passName = `pass-${Object.keys(this.passes).length}:-${name ?? ""}`;
const pass = new Pass(
this.w,
{
...materialProperties,
name: passName,
},
);

    for (const [name, { data, itemSize }] of Object.entries(instanceAttributes ?? {})) {
      pass.setInstanceAttribute(name, data, itemSize);
    }

    this.passes[passName] = pass;
    return pass;
}
}

class RenderTarget {
constructor(name, texture, framebuffer) {
this.name = name;
this.texture = texture;
this.framebuffer = framebuffer;
}
}

class WebGL2MicroLayer {
constructor(canvas) {
this.gl = canvas.getContext('webgl2', {
antialiasing: false,
powerPreference: "high-performance",
alpha: false
});
if (!this.gl) {
throw new Error('WebGL2 not supported');
}
const extF = this.gl.getExtension("EXT_color_buffer_float");
const extHF = this.gl.getExtension("EXT_color_buffer_half_float");
const extFL = this.gl.getExtension("OES_texture_float_linear");
this.gl.disable(this.gl.DEPTH_TEST);
this.gl.disable(this.gl.BLEND);
this.gl.disable(this.gl.SCISSOR_TEST);
this.gl.clearDepth(1.0);
this.gl.colorMask(true, true, true, true);

    this.programs = new Map();
    this.framebuffers = new Map();
    this.textures = new Map();
    this.defaultRenderTargetProps = {
      minFilter: this.gl.NEAREST,
      magFilter: this.gl.NEAREST,
      internalFormat: this.gl.RGBA16F,
      format: this.gl.RGBA,
      type: this.gl.HALF_FLOAT
    }
    this.renderTargets = {};
}

createProgram(vertexShaderSource, fragmentShaderSource) {
const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(program));
    }

    return program;
}

addLineNumbers(source) {
return source.split('\n').map((line, index) => `${index + 1}: ${line}`).join('\n');
}

createShader(type, source) {
const shader = this.gl.createShader(type);
this.gl.shaderSource(shader, source);
this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error('An error occurred compiling the shaders: ' + this.gl.getShaderInfoLog(shader) + `\n${this.addLineNumbers(source)}`);
    }

    return shader;
}

createTextureFromImage(path, cb) {
// Load the texture
const gl = this.gl;
const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);

    // Fill the texture with a 1x1 blue pixel as a placeholder
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));

    // Asynchronously load an image
    const image = new Image();
    image.src = path;
    image.onload = function() {
      // Create a temporary canvas to flip the image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = image.width;
      tempCanvas.height = image.height;
      const tempCtx = tempCanvas.getContext('2d');

      // Flip the image horizontally and vertically
      tempCtx.scale(1, -1);
      tempCtx.drawImage(image, 0, -image.height);

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tempCanvas);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.bindTexture(gl.TEXTURE_2D, null)

      if (cb) {
        cb();
      }
    };

    return texture;
}

createRenderTarget(width, height, overrides = {}, name = undefined) {
const {
generateMipmaps,
minFilter,
magFilter,
internalFormat,
format,
type
} = {
...(this.defaultRenderTargetProps),
...overrides
};
const gl = this.gl;

    const renderTargetName = name ?? `rt-${Object.keys(this.renderTargets).length}`;

    const framebuffer = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);

    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, minFilter);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, magFilter);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);
    //this.clear();

    const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
    if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('Framebuffer is not complete: ' + status);
    }

    // Unbind the frame buffer and texture.
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);

    this.framebuffers.set(renderTargetName, {framebuffer, texture, width, height});
    this.renderTargets[renderTargetName] = new RenderTarget(
      renderTargetName, texture, framebuffer
    );
    return this.renderTargets[renderTargetName];
}

setRenderTargetInternal(name, autoClear = true) {
if (name === null) {
this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
} else {
const target = this.framebuffers.get(name);
if (!target) {
throw new Error(`Render target "${name}" not found`);
}
this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, target.framebuffer);
this.gl.viewport(0, 0, target.width, target.height);
}
}

setRenderTarget(renderTarget, autoClear = true) {
return this.setRenderTargetInternal(renderTarget?.name ?? null, autoClear);
}

clear() {
// this.gl.clearColor(0.9, 0.9, 0.9, 1.0);
// this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT);
}

getRenderTargetTexture(name) {
const target = this.framebuffers.get(name);
if (!target) {
throw new Error(`Render target "${name}" not found`);
}
return target.texture;
}

setUniform(gl, textureUnits, numUniforms, uniforms, program, name, value) {
const location = gl.getUniformLocation(program, name);
if (location === null) {
// console.warn(`Uniform "${name}" not found in the shader program.`);
return;
}

    // Get uniform info
    let uniformInfo = null;
    for (let i = 0; i < numUniforms; i++) {
      const info = gl.getActiveUniform(program, i);
      if (info.name === name) {
        uniformInfo = info;
        break;
      }
    }

    if (!uniformInfo) {
      console.warn(`Unable to find uniform info for "${name}"`);
      return;
    }

    const { type, size } = uniformInfo;

    // Helper function to ensure array is of the correct type
    function ensureTypedArray(arr, Type) {
      return arr instanceof Type ? arr : new Type(arr);
    }

    switch (type) {
      // Scalars
      case gl.FLOAT:
        gl.uniform1f(location, value);
        break;
      case gl.INT:
      case gl.BOOL:
        gl.uniform1i(location, value);
        break;

      // Vectors
      case gl.FLOAT_VEC2:
        gl.uniform2fv(location, ensureTypedArray(value, Float32Array));
        break;
      case gl.FLOAT_VEC3:
        gl.uniform3fv(location, ensureTypedArray(value, Float32Array));
        break;
      case gl.FLOAT_VEC4:
        gl.uniform4fv(location, ensureTypedArray(value, Float32Array));
        break;
      case gl.INT_VEC2:
      case gl.BOOL_VEC2:
        gl.uniform2iv(location, ensureTypedArray(value, Int32Array));
        break;
      case gl.INT_VEC3:
      case gl.BOOL_VEC3:
        gl.uniform3iv(location, ensureTypedArray(value, Int32Array));
        break;
      case gl.INT_VEC4:
      case gl.BOOL_VEC4:
        gl.uniform4iv(location, ensureTypedArray(value, Int32Array));
        break;

      // Matrices
      case gl.FLOAT_MAT2:
        gl.uniformMatrix2fv(location, false, ensureTypedArray(value, Float32Array));
        break;
      case gl.FLOAT_MAT3:
        gl.uniformMatrix3fv(location, false, ensureTypedArray(value, Float32Array));
        break;
      case gl.FLOAT_MAT4:
        gl.uniformMatrix4fv(location, false, ensureTypedArray(value, Float32Array));
        break;

      // Sampler types
      case gl.SAMPLER_2D:
      case gl.SAMPLER_CUBE:
        const textureUnit = textureUnits.length;
        this.gl.activeTexture(this.gl.TEXTURE0 + textureUnit);
        textureUnits.push(textureUnit);
        this.gl.bindTexture(this.gl.TEXTURE_2D, value);
        this.gl.uniform1i(location, textureUnit);


        // Can we disable this if not using mipmaps?
        // if (generateMipmaps) {
        if (value != null) {
          this.gl.generateMipmap(this.gl.TEXTURE_2D);
        }
        // }
        break;

      // Arrays
      default:
        if (type === gl.FLOAT && size > 1) {
          gl.uniform1fv(location, ensureTypedArray(value, Float32Array));
        } else if ((type === gl.INT || type === gl.BOOL) && size > 1) {
          gl.uniform1iv(location, ensureTypedArray(value, Int32Array));
        } else {
          console.warn(`Unsupported uniform type: ${type}`);
        }
        break;
    }
}

render(programName, uniforms = {}, attributes = {}) {
const program = this.programs.get(programName);
if (!program) {
throw new Error(`Program "${programName}" not found`);
}

    this.gl.useProgram(program);

    const textureUnits = [];
    const numUniforms = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS);

    for (const [name, value] of Object.entries(uniforms)) {
      this.setUniform(this.gl, textureUnits, numUniforms, uniforms, program, name, value);
    }

    // TODO: I think we should only update if needed...
    const vertexCount = this.setupAttributes(program, attributes);
    const numInstances = attributes.numInstances || 1;

    if (numInstances > 1) {
      this.gl.drawArraysInstanced(this.gl.TRIANGLE_STRIP, 0, vertexCount, numInstances);
    } else {
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, vertexCount);
    }

    this.resetInstancedAttributes(program, attributes);
}

setupAttributes(program, attributes) {
// Hardcoded to 32 for now
let byteLength = 32;
let vertexCount = 0;

    for (const [name, value] of Object.entries(attributes)) {
      if (name === 'instanceAttributes' || name === 'numInstances') continue;

      const location = this.gl.getAttribLocation(program, name);
      if (location === -1) {
        console.error(`Failed to find: ${name}`);
        continue;
      }
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, value.buffer);
      this.gl.enableVertexAttribArray(location);
      this.gl.vertexAttribPointer(location, value.size, this.gl.FLOAT, false, 0, 0);
      vertexCount = value.count || (byteLength / (value.size * 4));
    }

    if (Object.keys(attributes.instanceAttributes).length) {
      for (const [name, value] of Object.entries(attributes.instanceAttributes)) {

        const location = this.gl.getAttribLocation(program, name);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, value.buffer);
        this.gl.enableVertexAttribArray(location);
        this.gl.vertexAttribPointer(location, value.itemSize, this.gl.FLOAT, false, 0, 0);
        this.gl.vertexAttribDivisor(location, 1);
      }
    }

    return 4;
}

resetInstancedAttributes(program, attributes) {
if (Object.keys(attributes.instanceAttributes).length) {
for (const name of Object.keys(attributes.instanceAttributes)) {
const location = this.gl.getAttribLocation(program, name);
this.gl.vertexAttribDivisor(location, 0);
}
}
}

createArrayBuffer(value, size) {
const buffer = this.gl.createBuffer();
this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
this.gl.bufferData(
this.gl.ARRAY_BUFFER,
value,
this.gl.STATIC_DRAW
);
return {buffer, size};
}

createPipeline() {
return new Pipeline(this);
}
}

function webGlContext() {
const canvas = document.createElement('canvas');
const w = new WebGL2MicroLayer(canvas);
const pipeline = w.createPipeline();
return { w, canvas, pipeline} ;
}

function webGlInit(
context,
width,
height,
materialProperties,
renderTargetOverrides = {},
extra = {}
) {
const { w, pipeline, canvas } = context;
const dpr = extra.dpr || window.devicePixelRatio || 1;
const scaling = dpr;
const scale = extra.scale ? scaling : 1.0;
const canvasScale = extra.canvasScale ?? 1.0;

canvas.width = width * scaling;
canvas.height = height * scaling;
canvas.style.width = `${width * canvasScale}px`;
canvas.style.height = `${height * canvasScale}px`;

const renderTargetProps = {
minFilter: w.gl.NEAREST,
magFilter: w.gl.NEAREST,
internalFormat: w.gl.RGBA16F,
format: w.gl.RGBA,
type: w.gl.HALF_FLOAT,
...renderTargetOverrides
};

const rtA = w.createRenderTarget(width * scale, height * scale, renderTargetProps);
const rtB = w.createRenderTarget(width * scale, height * scale, renderTargetProps);
const renderTargets = [rtA, rtB];

const pass = pipeline.createPass(materialProperties, renderTargetProps.generateMipmaps);

return {
canvas,
render: (uniforms = {}) => {
pass.render(uniforms);
},
renderTargets,
renderer: w,
scaling,
uniforms: pass.uniforms,
gl: pipeline.w.gl,
stage: pass,
};
}
```

<br />

```javascript
// @run
class BaseSurface {
  constructor({ id, width, height, radius = 5, dpr, canvasScale }) {
    this.context = webGlContext();
    const { w, canvas } = this.context;
    this.w = w;
    this.gl = w.gl;
    this.renderer = w;
    this.canvas = canvas;

    this.alpha = 1.0;
    this.dpr = dpr || 1;
    this.canvasScale = canvasScale;
    this.width = width;
    this.height = height;
    // Create PaintableCanvas instances
    this.createSurface(this.width, this.height, radius);
    this.id = id;
    this.initialized = false;
    this.initialize();
  }

  createSurface(width, height, radius) {
    this.surface = new PaintableCanvas({ width, height, radius });
  }

  initialize() {
    // Child class should fill this out
  }

  load() {
    // Child class should fill this out
  }

  clear() {
    // Child class should fill this out
  }

  renderPass() {
    // Child class should fill this out
  }

  reset() {
    this.clear();
    let last = undefined;
    return new Promise((resolve) => {
      this.setHex("#f9a875");
      getFrame(() => this.draw(last, 0, false, resolve));
    }).then(() => new Promise((resolve) => {
      last = undefined;
      getFrame(() => {
        this.setHex("#000000");
        getFrame(() => this.draw(last, 0, true, resolve));
      });
    }))
      .then(() => {
        this.renderPass();
        getFrame(() => this.setHex("#fff6d3"));
      });

  }

  draw(last, t, isShadow, resolve) {
    if (t >= 10.0) {
      resolve();
      return;
    }

    const angle = (t * 0.05) * Math.PI * 2;

    let {x, y} = isShadow
      ? {
        x: 90 + 12 * t,
        y: 200 + 1 * t,
      }
      : {
        x: 100 + 100 * Math.sin(angle + 0.25) * Math.cos(angle * 0.15),
        y: 50 + 100 * Math.sin(angle * 0.7)
      };

    if (this.canvasScale != null) {
      x /= this.canvasScale;
      y /= this.canvasScale;
    }

    last ??= {x, y};

    this.surface.drawSmoothLine(last, {x, y});
    last = {x, y};

    const step = instantMode ? 5.0 : (isShadow ? 0.7 : 0.3);
    getFrame(() => this.draw(last, t + step, isShadow, resolve));
  }

  buildCanvas() {
    return intializeCanvas({
      id: this.id,
      canvas: this.canvas,
      onSetColor: ({r, g, b, a}) => {
        const alpha = a == 0 ? a : this.alpha;
        this.surface.currentColor = {r, g, b, a: alpha};
        this.drawUniforms.color = [
          this.surface.currentColor.r / 255.0,
          this.surface.currentColor.g / 255.0,
          this.surface.currentColor.b / 255.0,
          alpha,
        ];
      },
      startDrawing: (e) => this.surface.startDrawing(e),
      onMouseMove: (e) => this.surface.onMouseMove(e),
      stopDrawing: (e, redraw) => this.surface.stopDrawing(e, redraw),
      clear: () => this.clear(),
      reset: () => this.reset(),
      ...this.canvasModifications()
    });
  }

  canvasModifications() {
    return {}
  }

  observe() {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting === true) {
        this.load();
        observer.disconnect(this.container);
      }
    });

    observer.observe(this.container);
  }

  initWebGL2({ uniforms, fragmentShader, vertexShader, numInstances, instanceAttributes, renderTargetOverrides, ...rest }) {
    return webGlInit(
      this.context,
      this.width,
      this.height,
      {
        uniforms,
        vertexShader,
        fragmentShader,
        instanceAttributes,
        numInstances,
      },
      renderTargetOverrides ?? {}, {
      dpr: this.dpr, canvasScale: this.canvasScale || 1, ...rest,
    })
  }
}