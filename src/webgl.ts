const prefix = `#version 300 es
precision highp float;
precision highp int;
`;

// Vertex Shader (shared by both passes)
const vertexShaderDefault = `in vec2 position;
out vec2 vUv;
void main() {
    vUv = 0.5 * (position + 1.0);
    gl_Position = vec4(position, 0.0, 1.0);
}`;

export interface InstanceAttributeData {
  data: Float32Array;
  itemSize: number;
}

export interface MaterialProperties {
  fragmentShader: string;
  vertexShader?: string;
  uniforms: Record<string, any>;
  name?: string;
  instanceAttributes?: Record<string, InstanceAttributeData>;
  numInstances?: number;
}

interface Attribute {
  buffer: WebGLBuffer;
  size: number;
}

interface InstancedAttribute {
  buffer: WebGLBuffer;
  itemSize: number;
}

interface RenderAttributes {
  position?: Attribute;
  instanceAttributes?: Record<string, InstancedAttribute>;
  numInstances?: number;
}

interface RenderTargetProps {
  generateMipmaps?: boolean;
  minFilter?: number;
  magFilter?: number;
  internalFormat?: number;
  format?: number;
  type?: number;
}

interface FramebufferInfo {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
}

export interface WebGLInitResult {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  render: (options?: { uniforms?: Record<string, any>, renderTarget?: RenderTarget | null }) => void;
  renderTargets: RenderTarget[];
  renderer: WebGL2MicroLayer;
  scaling: number;
  uniforms: Record<string, any>;
  gl: WebGL2RenderingContext;
  stage: Pass;
}

interface WebGLInitExtra {
  dpr?: number;
  scale?: boolean;
  canvasScale?: number;
  renderTargetCount?: number;
}

class Pass {
  private vertexShader: string;
  private fragmentShader: string;
  private program: WebGLProgram;
  private quad: Attribute;
  private name: string;
  private w: WebGL2MicroLayer;
  uniforms: Record<string, any>;
  private instancedAttributes: Record<string, InstancedAttribute>;
  private numInstances: number;
  private isInstanced: boolean;

  constructor(w: WebGL2MicroLayer, quad: Attribute, materialProperties: MaterialProperties) {
    const {fragmentShader, vertexShader, uniforms, name, instanceAttributes, numInstances} = materialProperties;
    this.vertexShader = vertexShader ?? vertexShaderDefault;
    this.fragmentShader = fragmentShader;
    this.program = w.createProgram(
      `${prefix}${this.vertexShader}`,
      `${prefix}${this.fragmentShader}`
    );
    this.uniforms = uniforms;
    this.quad = quad;
    this.name = name || '';
    w.programs.set(name || '', this.program);
    this.w = w;
    this.instancedAttributes = {};
    this.numInstances = numInstances || 1;
    this.isInstanced = !!instanceAttributes && Object.keys(instanceAttributes).length > 0;
  }

  setInstanceAttribute(name: string, data: Float32Array, itemSize: number): void {
    this.instancedAttributes[name] = this.w.createInstancedAttribute(data, itemSize);
    this.isInstanced = true;
  }

  updateFragmentShader(fragmentShader: string): void {
    this.fragmentShader = fragmentShader;
    this.program = this.w.createProgram(
      this.vertexShader,
      `${prefix}${this.fragmentShader}`
    );
    this.w.programs.set(this.name, this.program);
  }

  set(updates: Record<string, any>): void {
    Object.keys(updates).forEach((key) => {
      this.uniforms[key] = updates[key];
    });
  }

  render(options?: { uniforms?: Record<string, any>, renderTarget?: RenderTarget | null }): void {
    if (options?.uniforms) {
      this.set(options.uniforms);
    }
    if (typeof options?.renderTarget !== "undefined") {
      this.w.setRenderTarget(options.renderTarget);
    } else {
      this.w.setRenderTarget(null);
    }

    if (this.isInstanced) {
      this.w.render(
        this.name,
        this.uniforms,
        {
          position: this.quad,
          instanceAttributes: this.instancedAttributes,
          numInstances: this.numInstances
        },
      );
    } else {
      this.w.render(
        this.name,
        this.uniforms,
        {position: this.quad},
      );
    }
  }
}

export class WebGLPipeline {
  w: WebGL2MicroLayer;
  private quad: Attribute;
  private passes: Record<string, Pass>;

  constructor(w: WebGL2MicroLayer, quad: Attribute = w.createFullscreenQuad()) {
    this.w = w;
    this.quad = quad;
    this.passes = {};
  }

  createInstancedAttribute(data: Float32Array, itemSize: number): InstancedAttribute {
    return this.w.createInstancedAttribute(data, itemSize);
  }

  add(
    materialProperties: MaterialProperties,
    renderTargetOverrides: RenderTargetProps = {},
    extra: WebGLInitExtra = {},
  ): WebGLInitResult {
    const dpr = extra.dpr || window.devicePixelRatio || 1;
    const scale = extra.scale ? dpr : 1.0;

    const w = this.w;
    const canvas = this.w.canvas;
    const width = this.w.canvas.width;
    const height = this.w.canvas.height;

    // Set the viewport to match the canvas size
    w.gl.viewport(0, 0, canvas.width, canvas.height);

    const renderTargetProps = {
      minFilter: w.gl.NEAREST,
      magFilter: w.gl.NEAREST,
      internalFormat: w.gl.RGBA16F,
      format: w.gl.RGBA,
      type: w.gl.HALF_FLOAT,
      ...renderTargetOverrides
    };

    const renderTargetCount = extra?.renderTargetCount ?? 2;
    const renderTargets: RenderTarget[] = [];

    for (let i = 0; i < renderTargetCount; i++) {
      renderTargets.push(
        w.createRenderTarget(width * scale, height * scale, renderTargetProps)
      );
    }

    const pass = this.createPass(materialProperties);

    return {
      canvas,
      render: (options?: { uniforms?: Record<string, any>, renderTarget?: RenderTarget | null }) => {
        pass.render({ uniforms: options?.uniforms, renderTarget: options?.renderTarget });
      },
      renderTargets,
      renderer: w,
      scaling: dpr,
      uniforms: pass.uniforms,
      gl: this.gl(),
      stage: pass,
    };
  }

  createPass(materialProperties: MaterialProperties): Pass {
    const {name, instanceAttributes} = materialProperties;
    const passName = `pass-${Object.keys(this.passes).length}:-${name ?? ""}`;
    const pass = new Pass(
      this.w,
      this.quad,
      {
        ...materialProperties,
        name: passName,
      },
    );

    // Set up any instance attributes that were provided
    if (instanceAttributes) {
      for (const [attrName, {data, itemSize}] of Object.entries(instanceAttributes)) {
        pass.setInstanceAttribute(attrName, data, itemSize);
      }
    }

    this.passes[passName] = pass;
    return pass;
  }

  gl() {
    return this.w.gl;
  }
}

class RenderTarget {
  private gl: WebGL2RenderingContext;
  public name: string;
  public texture: WebGLTexture;
  public framebuffer: WebGLFramebuffer;

  constructor(gl: WebGL2RenderingContext, name: string, texture: WebGLTexture, framebuffer: WebGLFramebuffer) {
    this.gl = gl;
    this.name = name;
    this.texture = texture;
    this.framebuffer = framebuffer;
  }

  updateFilters({minFilter, magFilter}: {minFilter: number, magFilter: number}): void {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, minFilter);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, magFilter);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }
}

export class WebGL2MicroLayer {
  public canvas: HTMLCanvasElement | OffscreenCanvas;
  public gl: WebGL2RenderingContext;
  public programs: Map<string, WebGLProgram>;
  public framebuffers: Map<string, FramebufferInfo>;
  public defaultRenderTargetProps: RenderTargetProps;
  public renderTargets: Record<string, RenderTarget>;
  // Track the active attributes to ensure proper cleanup
  private activeAttributes: Set<number> = new Set();
  // Track the active instanced attributes to ensure proper cleanup
  private activeInstancedAttributes: Set<number> = new Set();

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, extra?: {
    canvasScale?: number;
    dpr?: number;
  }) {
    this.canvas = canvas;
    const dpr = extra?.dpr ?? (window.devicePixelRatio || 1);
    const canvasScale = extra?.canvasScale ?? 1.0 / dpr;
    const width = canvas.width;
    const height = canvas.height;

    if ("style" in canvas) {
      canvas.style.width = `${width * canvasScale}px`;
      canvas.style.height = `${height * canvasScale}px`;
    }

    const gl = canvas.getContext('webgl2', {antialiasing: false, alpha: false}) as WebGL2RenderingContext;
    if (!gl) {
      throw new Error('WebGL2 not supported');
    }
    this.gl = gl;
    this.gl.getExtension("EXT_color_buffer_float");
    this.gl.getExtension("EXT_color_buffer_half_float");
    this.gl.getExtension("OES_texture_float_linear");
    this.gl.disable(this.gl.DEPTH_TEST);
    this.gl.disable(this.gl.BLEND);
    this.gl.disable(this.gl.SCISSOR_TEST);
    this.gl.clearDepth(1.0);
    this.gl.colorMask(true, true, true, true);

    this.programs = new Map();
    this.framebuffers = new Map();

    this.defaultRenderTargetProps = {
      minFilter: this.gl.NEAREST,
      magFilter: this.gl.NEAREST,
      internalFormat: this.gl.RGBA16F,
      format: this.gl.RGBA,
      type: this.gl.HALF_FLOAT
    };
    this.renderTargets = {};
    
    // Initialize WebGL state tracking
    const maxVertexAttribs = this.gl.getParameter(this.gl.MAX_VERTEX_ATTRIBS);
    for (let i = 0; i < maxVertexAttribs; i++) {
      this.gl.disableVertexAttribArray(i);
      this.gl.vertexAttribDivisor(i, 0);
    }
  }

  createProgram(vertexShaderSource: string, fragmentShaderSource: string): WebGLProgram {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = this.gl.createProgram();
    if (!program) {
      throw new Error('Failed to create WebGL program');
    }

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(program));
    }

    return program;
  }

  addLineNumbers(source: string): string {
    return source.split('\n').map((line, index) => `${index + 1}: ${line}`).join('\n');
  }

  createShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create WebGL shader');
    }

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error('An error occurred compiling the shaders: ' + this.gl.getShaderInfoLog(shader) + `\n${this.addLineNumbers(source)}`);
    }

    return shader;
  }

  createTextureFromImage(path: string, cb?: () => void): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create WebGL texture');
    }
    // Asynchronously load an image
    const image = new Image();
    image.src = path;
    const self = this;
    image.onload = function() {
      // Create a temporary canvas to flip the image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = image.width;
      tempCanvas.height = image.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        throw new Error('Failed to get 2D context');
      }

      tempCtx.drawImage(image, 0, image.height);

      self.createTextureFromCanvas(tempCanvas);

      if (cb) {
        cb();
      }
    };

    return texture;
  }

  createTextureFromCanvas(canvas: HTMLCanvasElement | OffscreenCanvas): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create WebGL texture');
    }

    const tempCtx = canvas.getContext('2d');
    if (!tempCtx) {
      throw new Error('Failed to get 2D context');
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    // Tell WebGL to flip the Y axis when unpacking the texture
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    // Reset the pixel store parameter to its default
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return texture;
  }

  createRenderTarget(width: number, height: number, overrides: RenderTargetProps = {}, name?: string): RenderTarget {
    const {
      // generateMipmaps,
      minFilter,
      magFilter,
      internalFormat,
      format,
      type
    } = {
      ...(this.defaultRenderTargetProps),
      ...overrides
    };

    const renderTargetName = name ?? `rt-${Object.keys(this.renderTargets).length}`;

    const framebuffer = this.gl.createFramebuffer();
    if (!framebuffer) {
      throw new Error('Failed to create framebuffer');
    }

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);

    const texture = this.gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create texture');
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, internalFormat!, width, height, 0, format!, type!, null);

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, minFilter!);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, magFilter!);
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
      this.gl, renderTargetName, texture, framebuffer
    );
    return this.renderTargets[renderTargetName];
  }

  setRenderTargetInternal(name: string | null): void {
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

  setRenderTarget(renderTarget: RenderTarget | null): void {
    return this.setRenderTargetInternal(renderTarget?.name ?? null);
  }

  clear(): void {
    this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT);
  }

  getRenderTargetTexture(name: string): WebGLTexture {
    const target = this.framebuffers.get(name);
    if (!target) {
      throw new Error(`Render target "${name}" not found`);
    }
    return target.texture;
  }

  setUniform(
    gl: WebGL2RenderingContext,
    textureUnits: number[],
    numUniforms: number,
    program: WebGLProgram,
    name: string,
    value: any
  ): void {
    const location = gl.getUniformLocation(program, name);
    if (location === null) {
      // console.warn(`Uniform "${name}" not found in the shader program.`);
      return;
    }

    // Get uniform info
    let uniformInfo: WebGLActiveInfo | null = null;
    for (let i = 0; i < numUniforms; i++) {
      const info = gl.getActiveUniform(program, i);
      if (info && info.name === name) {
        uniformInfo = info;
        break;
      }
    }

    if (!uniformInfo) {
      console.warn(`Unable to find uniform info for "${name}"`);
      return;
    }

    const {type, size} = uniformInfo;

    // Helper function to ensure array is of the correct type
    function ensureTypedArray<T extends Float32Array | Int32Array>(arr: any, Type: new(buffer: ArrayBufferLike) => T): T {
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

  render(programName: string, uniforms: Record<string, any> = {}, attributes: RenderAttributes = {}): void {
    const program = this.programs.get(programName);
    if (!program) {
      throw new Error(`Program "${programName}" not found`);
    }

    try {
      this.gl.useProgram(program);

      // Already has the font-image
      const textureUnits: number[] = [];

      const numUniforms = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS);

      for (const [name, value] of Object.entries(uniforms)) {
        this.setUniform(this.gl, textureUnits, numUniforms, program, name, value);
      }

      const vertexCount = this.setupAttributes(program, attributes);
      const numInstances = attributes.numInstances || 1;

      if (attributes.instanceAttributes && Object.keys(attributes.instanceAttributes).length > 0) {
        this.gl.drawArraysInstanced(this.gl.TRIANGLE_STRIP, 0, vertexCount, numInstances);
      } else {
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, vertexCount);
      }
    } finally {
      // Always reset attributes, even if an error occurs during rendering
      this.resetInstancedAttributes();
      
      // Reset texture units
      for (let i = 0; i < 16; i++) { // 16 is a reasonable max number of texture units
        this.gl.activeTexture(this.gl.TEXTURE0 + i);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
      }
      
      // Reset program
      this.gl.useProgram(null);
    }
  }

  setupAttributes(program: WebGLProgram, attributes: RenderAttributes): number {
    // First, disable all attributes and reset all divisors to avoid state bleeding
    const maxVertexAttribs = this.gl.getParameter(this.gl.MAX_VERTEX_ATTRIBS);
    for (let i = 0; i < maxVertexAttribs; i++) {
      this.gl.disableVertexAttribArray(i);
      this.gl.vertexAttribDivisor(i, 0);
    }
    
    // Clear our tracking sets at the beginning of each new render
    this.activeAttributes.clear();
    this.activeInstancedAttributes.clear();

    // Set up regular attributes
    for (const [name, value] of Object.entries(attributes)) {
      if (name === 'instanceAttributes' || name === 'numInstances') continue;

      const location = this.gl.getAttribLocation(program, name);
      if (location === -1) {
        console.warn(`Attribute "${name}" not found in shader program`);
        continue;
      }
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, value.buffer);
      this.gl.enableVertexAttribArray(location);
      this.gl.vertexAttribPointer(location, value.size, this.gl.FLOAT, false, 0, 0);
      // Explicitly set divisor to 0 for regular attributes
      this.gl.vertexAttribDivisor(location, 0);
      
      // Track this attribute for cleanup
      this.activeAttributes.add(location);
    }

    // Set up instanced attributes
    if (attributes.instanceAttributes) {
      for (const [name, value] of Object.entries(attributes.instanceAttributes)) {
        const location = this.gl.getAttribLocation(program, name);
        if (location === -1) {
          console.warn(`Instanced attribute "${name}" not found in shader program`);
          continue;
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, value.buffer);
        this.gl.enableVertexAttribArray(location);
        this.gl.vertexAttribPointer(location, value.itemSize, this.gl.FLOAT, false, 0, 0);
        this.gl.vertexAttribDivisor(location, 1); // This is the key to instancing!
        
        // Track this instanced attribute for cleanup
        this.activeInstancedAttributes.add(location);
      }
    }

    return 4; // Quad is always 4 vertices
  }

  resetInstancedAttributes(): void {
    // Reset divisors for all tracked instanced attributes
    for (const location of this.activeInstancedAttributes) {
      // Reset the divisor
      this.gl.vertexAttribDivisor(location, 0);
      // Also disable the attribute to fully reset state
      this.gl.disableVertexAttribArray(location);
    }
    
    // Also disable regular attributes that we tracked
    for (const location of this.activeAttributes) {
      this.gl.disableVertexAttribArray(location);
    }
    
    // For additional safety, disable all possible attribute arrays
    // This ensures attributes from one shader don't affect another
    const maxVertexAttribs = this.gl.getParameter(this.gl.MAX_VERTEX_ATTRIBS);
    for (let i = 0; i < maxVertexAttribs; i++) {
      this.gl.disableVertexAttribArray(i);
      this.gl.vertexAttribDivisor(i, 0);  // Reset divisor for all attributes
    }
    
    // Clear our tracking sets after cleanup
    this.activeAttributes.clear();
    this.activeInstancedAttributes.clear();
    
    // Unbind any buffer to clean up state
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
  }

  createFullscreenQuad(): Attribute {
    const buffer = this.gl.createBuffer();
    if (!buffer) {
      throw new Error('Failed to create buffer');
    }
    
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      this.gl.STATIC_DRAW
    );
    return {buffer, size: 2};
  }
  
  createInstancedAttribute(data: Float32Array, itemSize: number): InstancedAttribute {
    const buffer = this.gl.createBuffer();
    if (!buffer) {
      throw new Error('Failed to create instanced buffer');
    }
    
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);
    return { buffer, itemSize };
  }

  cleanup() {
    this.clear();

    // Delete any render targets with this layer's name
    // Object.values(this.renderTargets).forEach(rt => {
    //   const texture = rt.texture;
    //   this.gl.deleteTexture(texture);
    // });

    // Array.from(this.framebuffers.entries()).forEach(([key, framebuffer]) => {
    //   this.gl.deleteFramebuffer(framebuffer);
    //   this.framebuffers.delete(key);
    // });
  }
}

export function createPipeline(canvas: HTMLCanvasElement | OffscreenCanvas): WebGLPipeline {
  const w = new WebGL2MicroLayer(canvas);
  return new WebGLPipeline(w);
}

