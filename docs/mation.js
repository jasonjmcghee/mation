var U = Object.defineProperty;
var k = (i, e, t) => e in i ? U(i, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : i[e] = t;
var a = (i, e, t) => (k(i, typeof e != "symbol" ? e + "" : e, t), t);
const A = `#version 300 es
precision highp float;
precision highp int;
`, N = `in vec2 position;
out vec2 vUv;
void main() {
    vUv = 0.5 * (position + 1.0);
    gl_Position = vec4(position, 0.0, 1.0);
}`;
class X {
  constructor(e, t, s) {
    a(this, "vertexShader");
    a(this, "fragmentShader");
    a(this, "program");
    a(this, "quad");
    a(this, "name");
    a(this, "w");
    a(this, "uniforms");
    a(this, "instancedAttributes");
    a(this, "numInstances");
    a(this, "isInstanced");
    const { fragmentShader: o, vertexShader: r, uniforms: n, name: l, instanceAttributes: h, numInstances: d } = s;
    this.vertexShader = r ?? N, this.fragmentShader = o, this.program = e.createProgram(
      `${A}${this.vertexShader}`,
      `${A}${this.fragmentShader}`
    ), this.uniforms = n, this.quad = t, this.name = l || "", e.programs.set(l || "", this.program), this.w = e, this.instancedAttributes = {}, this.numInstances = d || 1, this.isInstanced = !!h && Object.keys(h).length > 0;
  }
  setInstanceAttribute(e, t, s) {
    this.instancedAttributes[e] = this.w.createInstancedAttribute(t, s), this.isInstanced = !0;
  }
  updateFragmentShader(e) {
    this.fragmentShader = e, this.program = this.w.createProgram(
      this.vertexShader,
      `${A}${this.fragmentShader}`
    ), this.w.programs.set(this.name, this.program);
  }
  set(e) {
    Object.keys(e).forEach((t) => {
      this.uniforms[t] = e[t];
    });
  }
  render(e) {
    e != null && e.uniforms && this.set(e.uniforms), typeof (e == null ? void 0 : e.renderTarget) < "u" ? this.w.setRenderTarget(e.renderTarget) : this.w.setRenderTarget(null), this.isInstanced ? this.w.render(
      this.name,
      this.uniforms,
      {
        position: this.quad,
        instanceAttributes: this.instancedAttributes,
        numInstances: this.numInstances
      }
    ) : this.w.render(
      this.name,
      this.uniforms,
      { position: this.quad }
    );
  }
}
class z {
  constructor(e, t = e.createFullscreenQuad()) {
    a(this, "w");
    a(this, "quad");
    a(this, "passes");
    this.w = e, this.quad = t, this.passes = {};
  }
  createInstancedAttribute(e, t) {
    return this.w.createInstancedAttribute(e, t);
  }
  add(e, t = {}, s = {}) {
    const o = s.dpr || window.devicePixelRatio || 1, r = s.scale ? o : 1, n = this.w, l = this.w.canvas, h = this.w.canvas.width, d = this.w.canvas.height;
    n.gl.viewport(0, 0, l.width, l.height);
    const g = {
      minFilter: n.gl.NEAREST,
      magFilter: n.gl.NEAREST,
      internalFormat: n.gl.RGBA16F,
      format: n.gl.RGBA,
      type: n.gl.HALF_FLOAT,
      ...t
    }, f = (s == null ? void 0 : s.renderTargetCount) ?? 2, p = [];
    for (let T = 0; T < f; T++)
      p.push(
        n.createRenderTarget(h * r, d * r, g)
      );
    const y = this.createPass(e);
    return {
      canvas: l,
      render: (T) => {
        y.render({ uniforms: T == null ? void 0 : T.uniforms, renderTarget: T == null ? void 0 : T.renderTarget });
      },
      renderTargets: p,
      renderer: n,
      scaling: o,
      uniforms: y.uniforms,
      gl: this.gl(),
      stage: y
    };
  }
  createPass(e) {
    const { name: t, instanceAttributes: s } = e, o = `pass-${Object.keys(this.passes).length}:-${t ?? ""}`, r = new X(
      this.w,
      this.quad,
      {
        ...e,
        name: o
      }
    );
    if (s)
      for (const [n, { data: l, itemSize: h }] of Object.entries(s))
        r.setInstanceAttribute(n, l, h);
    return this.passes[o] = r, r;
  }
  gl() {
    return this.w.gl;
  }
}
class Y {
  constructor(e, t, s, o) {
    a(this, "gl");
    a(this, "name");
    a(this, "texture");
    a(this, "framebuffer");
    this.gl = e, this.name = t, this.texture = s, this.framebuffer = o;
  }
  updateFilters({ minFilter: e, magFilter: t }) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, e), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, t), this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }
}
class $ {
  constructor(e, t) {
    a(this, "canvas");
    a(this, "gl");
    a(this, "programs");
    a(this, "framebuffers");
    a(this, "defaultRenderTargetProps");
    a(this, "renderTargets");
    // Track the active attributes to ensure proper cleanup
    a(this, "activeAttributes", /* @__PURE__ */ new Set());
    // Track the active instanced attributes to ensure proper cleanup
    a(this, "activeInstancedAttributes", /* @__PURE__ */ new Set());
    this.canvas = e;
    const s = (t == null ? void 0 : t.dpr) ?? (window.devicePixelRatio || 1), o = (t == null ? void 0 : t.canvasScale) ?? 1 / s, r = e.width, n = e.height;
    "style" in e && (e.style.width = `${r * o}px`, e.style.height = `${n * o}px`);
    const l = e.getContext("webgl2", { antialiasing: !1, alpha: !1 });
    if (!l)
      throw new Error("WebGL2 not supported");
    this.gl = l, this.gl.getExtension("EXT_color_buffer_float"), this.gl.getExtension("EXT_color_buffer_half_float"), this.gl.getExtension("OES_texture_float_linear"), this.gl.disable(this.gl.DEPTH_TEST), this.gl.disable(this.gl.BLEND), this.gl.disable(this.gl.SCISSOR_TEST), this.gl.clearDepth(1), this.gl.colorMask(!0, !0, !0, !0), this.programs = /* @__PURE__ */ new Map(), this.framebuffers = /* @__PURE__ */ new Map(), this.defaultRenderTargetProps = {
      minFilter: this.gl.NEAREST,
      magFilter: this.gl.NEAREST,
      internalFormat: this.gl.RGBA16F,
      format: this.gl.RGBA,
      type: this.gl.HALF_FLOAT
    }, this.renderTargets = {};
    const h = this.gl.getParameter(this.gl.MAX_VERTEX_ATTRIBS);
    for (let d = 0; d < h; d++)
      this.gl.disableVertexAttribArray(d), this.gl.vertexAttribDivisor(d, 0);
  }
  createProgram(e, t) {
    const s = this.createShader(this.gl.VERTEX_SHADER, e), o = this.createShader(this.gl.FRAGMENT_SHADER, t), r = this.gl.createProgram();
    if (!r)
      throw new Error("Failed to create WebGL program");
    if (this.gl.attachShader(r, s), this.gl.attachShader(r, o), this.gl.linkProgram(r), !this.gl.getProgramParameter(r, this.gl.LINK_STATUS))
      throw new Error("Unable to initialize the shader program: " + this.gl.getProgramInfoLog(r));
    return r;
  }
  addLineNumbers(e) {
    return e.split(`
`).map((t, s) => `${s + 1}: ${t}`).join(`
`);
  }
  createShader(e, t) {
    const s = this.gl.createShader(e);
    if (!s)
      throw new Error("Failed to create WebGL shader");
    if (this.gl.shaderSource(s, t), this.gl.compileShader(s), !this.gl.getShaderParameter(s, this.gl.COMPILE_STATUS))
      throw new Error("An error occurred compiling the shaders: " + this.gl.getShaderInfoLog(s) + `
${this.addLineNumbers(t)}`);
    return s;
  }
  createTextureFromImage(e, t) {
    const o = this.gl.createTexture();
    if (!o)
      throw new Error("Failed to create WebGL texture");
    const r = new Image();
    r.src = e;
    const n = this;
    return r.onload = function() {
      const l = document.createElement("canvas");
      l.width = r.width, l.height = r.height;
      const h = l.getContext("2d");
      if (!h)
        throw new Error("Failed to get 2D context");
      h.drawImage(r, 0, r.height), n.createTextureFromCanvas(l), t && t();
    }, o;
  }
  createTextureFromCanvas(e) {
    const t = this.gl, s = t.createTexture();
    if (!s)
      throw new Error("Failed to create WebGL texture");
    if (!e.getContext("2d"))
      throw new Error("Failed to get 2D context");
    return t.bindTexture(t.TEXTURE_2D, s), t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !1), t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL, !0), t.texImage2D(t.TEXTURE_2D, 0, t.RGBA, t.RGBA, t.UNSIGNED_BYTE, e), t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL, !1), t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !1), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_WRAP_S, t.CLAMP_TO_EDGE), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_WRAP_T, t.CLAMP_TO_EDGE), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_MIN_FILTER, t.NEAREST), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_MAG_FILTER, t.NEAREST), t.bindTexture(t.TEXTURE_2D, null), s;
  }
  createRenderTarget(e, t, s = {}, o) {
    const {
      // generateMipmaps,
      minFilter: r,
      magFilter: n,
      internalFormat: l,
      format: h,
      type: d
    } = {
      ...this.defaultRenderTargetProps,
      ...s
    }, g = o ?? `rt-${Object.keys(this.renderTargets).length}`, f = this.gl.createFramebuffer();
    if (!f)
      throw new Error("Failed to create framebuffer");
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, f);
    const p = this.gl.createTexture();
    if (!p)
      throw new Error("Failed to create texture");
    this.gl.bindTexture(this.gl.TEXTURE_2D, p), this.gl.texImage2D(this.gl.TEXTURE_2D, 0, l, e, t, 0, h, d, null), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, r), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, n), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE), this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, p, 0);
    const y = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
    if (y !== this.gl.FRAMEBUFFER_COMPLETE)
      throw new Error("Framebuffer is not complete: " + y);
    return this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null), this.gl.bindTexture(this.gl.TEXTURE_2D, null), this.framebuffers.set(g, { framebuffer: f, texture: p, width: e, height: t }), this.renderTargets[g] = new Y(
      this.gl,
      g,
      p,
      f
    ), this.renderTargets[g];
  }
  setRenderTargetInternal(e) {
    if (e === null)
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null), this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    else {
      const t = this.framebuffers.get(e);
      if (!t)
        throw new Error(`Render target "${e}" not found`);
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, t.framebuffer), this.gl.viewport(0, 0, t.width, t.height);
    }
  }
  setRenderTarget(e) {
    return this.setRenderTargetInternal((e == null ? void 0 : e.name) ?? null);
  }
  clear() {
    this.gl.clearColor(0, 0, 0, 0), this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT);
  }
  getRenderTargetTexture(e) {
    const t = this.framebuffers.get(e);
    if (!t)
      throw new Error(`Render target "${e}" not found`);
    return t.texture;
  }
  setUniform(e, t, s, o, r, n) {
    const l = e.getUniformLocation(o, r);
    if (l === null)
      return;
    let h = null;
    for (let p = 0; p < s; p++) {
      const y = e.getActiveUniform(o, p);
      if (y && y.name === r) {
        h = y;
        break;
      }
    }
    if (!h) {
      console.warn(`Unable to find uniform info for "${r}"`);
      return;
    }
    const { type: d, size: g } = h;
    function f(p, y) {
      return p instanceof y ? p : new y(p);
    }
    switch (d) {
      case e.FLOAT:
        e.uniform1f(l, n);
        break;
      case e.INT:
      case e.BOOL:
        e.uniform1i(l, n);
        break;
      case e.FLOAT_VEC2:
        e.uniform2fv(l, f(n, Float32Array));
        break;
      case e.FLOAT_VEC3:
        e.uniform3fv(l, f(n, Float32Array));
        break;
      case e.FLOAT_VEC4:
        e.uniform4fv(l, f(n, Float32Array));
        break;
      case e.INT_VEC2:
      case e.BOOL_VEC2:
        e.uniform2iv(l, f(n, Int32Array));
        break;
      case e.INT_VEC3:
      case e.BOOL_VEC3:
        e.uniform3iv(l, f(n, Int32Array));
        break;
      case e.INT_VEC4:
      case e.BOOL_VEC4:
        e.uniform4iv(l, f(n, Int32Array));
        break;
      case e.FLOAT_MAT2:
        e.uniformMatrix2fv(l, !1, f(n, Float32Array));
        break;
      case e.FLOAT_MAT3:
        e.uniformMatrix3fv(l, !1, f(n, Float32Array));
        break;
      case e.FLOAT_MAT4:
        e.uniformMatrix4fv(l, !1, f(n, Float32Array));
        break;
      case e.SAMPLER_2D:
      case e.SAMPLER_CUBE:
        const p = t.length;
        this.gl.activeTexture(this.gl.TEXTURE0 + p), t.push(p), this.gl.bindTexture(this.gl.TEXTURE_2D, n), this.gl.uniform1i(l, p), n != null && this.gl.generateMipmap(this.gl.TEXTURE_2D);
        break;
      default:
        d === e.FLOAT && g > 1 ? e.uniform1fv(l, f(n, Float32Array)) : (d === e.INT || d === e.BOOL) && g > 1 ? e.uniform1iv(l, f(n, Int32Array)) : console.warn(`Unsupported uniform type: ${d}`);
        break;
    }
  }
  render(e, t = {}, s = {}) {
    const o = this.programs.get(e);
    if (!o)
      throw new Error(`Program "${e}" not found`);
    try {
      this.gl.useProgram(o);
      const r = [], n = this.gl.getProgramParameter(o, this.gl.ACTIVE_UNIFORMS);
      for (const [d, g] of Object.entries(t))
        this.setUniform(this.gl, r, n, o, d, g);
      const l = this.setupAttributes(o, s), h = s.numInstances || 1;
      s.instanceAttributes && Object.keys(s.instanceAttributes).length > 0 ? this.gl.drawArraysInstanced(this.gl.TRIANGLE_STRIP, 0, l, h) : this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, l);
    } finally {
      this.resetInstancedAttributes();
      for (let r = 0; r < 16; r++)
        this.gl.activeTexture(this.gl.TEXTURE0 + r), this.gl.bindTexture(this.gl.TEXTURE_2D, null);
      this.gl.useProgram(null);
    }
  }
  setupAttributes(e, t) {
    const s = this.gl.getParameter(this.gl.MAX_VERTEX_ATTRIBS);
    for (let o = 0; o < s; o++)
      this.gl.disableVertexAttribArray(o), this.gl.vertexAttribDivisor(o, 0);
    this.activeAttributes.clear(), this.activeInstancedAttributes.clear();
    for (const [o, r] of Object.entries(t)) {
      if (o === "instanceAttributes" || o === "numInstances")
        continue;
      const n = this.gl.getAttribLocation(e, o);
      if (n === -1) {
        console.warn(`Attribute "${o}" not found in shader program`);
        continue;
      }
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, r.buffer), this.gl.enableVertexAttribArray(n), this.gl.vertexAttribPointer(n, r.size, this.gl.FLOAT, !1, 0, 0), this.gl.vertexAttribDivisor(n, 0), this.activeAttributes.add(n);
    }
    if (t.instanceAttributes)
      for (const [o, r] of Object.entries(t.instanceAttributes)) {
        const n = this.gl.getAttribLocation(e, o);
        if (n === -1) {
          console.warn(`Instanced attribute "${o}" not found in shader program`);
          continue;
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, r.buffer), this.gl.enableVertexAttribArray(n), this.gl.vertexAttribPointer(n, r.itemSize, this.gl.FLOAT, !1, 0, 0), this.gl.vertexAttribDivisor(n, 1), this.activeInstancedAttributes.add(n);
      }
    return 4;
  }
  resetInstancedAttributes() {
    for (const t of this.activeInstancedAttributes)
      this.gl.vertexAttribDivisor(t, 0), this.gl.disableVertexAttribArray(t);
    for (const t of this.activeAttributes)
      this.gl.disableVertexAttribArray(t);
    const e = this.gl.getParameter(this.gl.MAX_VERTEX_ATTRIBS);
    for (let t = 0; t < e; t++)
      this.gl.disableVertexAttribArray(t), this.gl.vertexAttribDivisor(t, 0);
    this.activeAttributes.clear(), this.activeInstancedAttributes.clear(), this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
  }
  createFullscreenQuad() {
    const e = this.gl.createBuffer();
    if (!e)
      throw new Error("Failed to create buffer");
    return this.gl.bindBuffer(this.gl.ARRAY_BUFFER, e), this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      this.gl.STATIC_DRAW
    ), { buffer: e, size: 2 };
  }
  createInstancedAttribute(e, t) {
    const s = this.gl.createBuffer();
    if (!s)
      throw new Error("Failed to create instanced buffer");
    return this.gl.bindBuffer(this.gl.ARRAY_BUFFER, s), this.gl.bufferData(this.gl.ARRAY_BUFFER, e, this.gl.STATIC_DRAW), { buffer: s, itemSize: t };
  }
  cleanup() {
    this.clear();
  }
}
function G(i) {
  const e = new $(i);
  return new z(e);
}
class ie {
  constructor(e, t, s, o = {}) {
    a(this, "name");
    a(this, "x");
    a(this, "y");
    a(this, "width");
    a(this, "height");
    a(this, "isSubview");
    a(this, "renderDuringPreviewAction");
    a(this, "extras");
    a(this, "pipeline");
    a(this, "ignorePanZoom");
    a(this, "render");
    this.name = e, this.pipeline = t, this.render = s, this.x = o.x, this.y = o.y, this.width = o.width, this.height = o.height, this.isSubview = o.isSubview, this.renderDuringPreviewAction = o.renderDuringPreviewAction, this.ignorePanZoom = o.ignorePanZoom, this.extras = o.extras;
  }
  cleanup() {
    this.pipeline.w.cleanup();
  }
}
const Z = {
  fragmentShader: `in vec2 vUv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform float u_progress;

void main() {
  fragColor = texture(u_texture, vUv);
}`,
  uniforms: {
    u_texture: null,
    u_progress: 0
  }
}, x = class x {
  constructor({ canvas: e, width: t, height: s }) {
    a(this, "canvas");
    a(this, "ctx");
    a(this, "width");
    a(this, "height");
    a(this, "_zoom", 1);
    a(this, "_pan", [0, 0]);
    a(this, "mousePosition", [0, 0]);
    a(this, "animationId", null);
    a(this, "texturePipelineResult");
    a(this, "layers", []);
    a(this, "layerLookup", {});
    a(this, "layerInitialProperties", {});
    a(this, "layerCanvases", {});
    a(this, "layerElements", {});
    a(this, "defaultLayerElements", []);
    a(this, "defaultLayerCanvas");
    a(this, "onFrame");
    // WebGL texture cache
    a(this, "textureCache", {});
    // Animation timeline properties
    a(this, "animationSegments", []);
    a(this, "isPlaying", !0);
    a(this, "currentTime", 0);
    a(this, "totalDuration", 0);
    a(this, "lastRenderTime", 0);
    a(this, "performingPreviewAction", !1);
    a(this, "renderQueued", !1);
    a(this, "targetFPS", 60);
    a(this, "frameInterval", 1e3 / 60 / 1e3);
    // Main render loop that respects target FPS
    a(this, "renderLoop", () => {
      var s;
      const e = performance.now(), t = e - this.lastRenderTime;
      if (t >= this.frameInterval || this.lastRenderTime === 0)
        if (this.lastRenderTime = e, this.isPlaying) {
          const o = t / 1e3, r = this.currentTime;
          this.currentTime = Math.min(this.currentTime + o, this.totalDuration), this.renderAtTime(this.currentTime), this.savePlayerState(), this.onFrame && this.onFrame(), this.currentTime >= this.totalDuration && ((s = window.mation) != null && s.loop ? (this.currentTime = 0, this.isPlaying = !0) : (this.isPlaying = !1, r < this.totalDuration && this.renderAtTime(this.totalDuration)), this.savePlayerState());
        } else
          this.renderQueued && (this.renderAtTime(this.currentTime), this.renderQueued = !1);
      this.isPlaying && (this.renderQueued = !0), this.isPlaying || this.renderQueued ? this.animationId = requestAnimationFrame(this.renderLoop) : this.animationId = null;
    });
    this.canvas = e, this.canvas.width = t, this.canvas.height = s, this.width = t, this.height = s;
    const { ctx: o, texturePipelineResult: r, defaultLayerCanvas: n } = this.initialize();
    this.ctx = o, this.texturePipelineResult = r, this.defaultLayerCanvas = n;
  }
  get zoom() {
    return this._zoom;
  }
  set zoom(e) {
    this._zoom = e, this.savePlayerState();
  }
  get pan() {
    return this._pan;
  }
  set pan(e) {
    this._pan = e, this.savePlayerState();
  }
  setMousePosition(e, t) {
    this.mousePosition = [e * window.devicePixelRatio, t * window.devicePixelRatio];
  }
  // Add debug logging to setZoom to see what's happening
  setZoom(e) {
    const [t, s] = this.mousePosition, o = (t - this._pan[0]) / this._zoom, r = (s - this._pan[1]) / this._zoom;
    this._zoom = e;
    const n = t - o * this._zoom, l = s - r * this._zoom;
    this._pan[0] = n, this._pan[1] = l, this.queueRender(), this.savePlayerState();
  }
  setPan(e) {
    this._pan = e, this.queueRender(), this.savePlayerState();
  }
  initialize() {
    const e = new OffscreenCanvas(this.width, this.height);
    e.width = this.width, e.height = this.height;
    const t = e.getContext("2d");
    if (!t)
      throw new Error("Failed to get 2D context");
    this.ctx = t;
    const s = G(this.canvas);
    return this.texturePipelineResult = s.add(Z), this.defaultLayerCanvas = new OffscreenCanvas(this.canvas.width, this.canvas.height), this.setupLayers(), this.restorePlayerState(), {
      ctx: t,
      texturePipelineResult: this.texturePipelineResult,
      defaultLayerCanvas: this.defaultLayerCanvas
    };
  }
  insertLayer(e, t) {
    this.layerInitialProperties[t.name] = {
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      isSubview: t.isSubview,
      renderDuringPreviewAction: t.renderDuringPreviewAction,
      extras: t.extras ? { ...t.extras } : void 0
    }, this.layerLookup[t.name] = t, this.layers.splice(e, 0, t), this.layerElements[t.name] = [];
    const s = t.width ?? this.canvas.width, o = t.height ?? this.canvas.height;
    this.layerCanvases[t.name] = new OffscreenCanvas(s, o);
  }
  pushLayer(e) {
    this.layerInitialProperties[e.name] = {
      x: e.x,
      y: e.y,
      width: e.width,
      height: e.height,
      isSubview: e.isSubview,
      renderDuringPreviewAction: e.renderDuringPreviewAction,
      extras: e.extras ? { ...e.extras } : void 0
    }, this.layerLookup[e.name] = e, this.layers.push(e), this.layerElements[e.name] = [], this.layerCanvases[e.name] = new OffscreenCanvas(
      this.canvas.width,
      this.canvas.height
    );
  }
  getLayer(e) {
    return this.layerLookup[e];
  }
  registerElement(e) {
    if (e.layer)
      if (Array.isArray(e.layer))
        for (const t of e.layer)
          this.layerLookup[t] && this.layerElements[t].push(e);
      else
        this.layerLookup[e.layer] ? this.layerElements[e.layer].push(e) : this.defaultLayerElements.push(e);
    else
      this.defaultLayerElements.push(e);
  }
  clear() {
    this.texturePipelineResult.renderer.cleanup(), this.layers.forEach((t) => {
      t.cleanup();
    }), this.defaultLayerCanvas.getContext("2d").clearRect(0, 0, this.defaultLayerCanvas.width, this.defaultLayerCanvas.height);
    for (const t in this.layerCanvases)
      this.layerCanvases[t].getContext("2d").clearRect(0, 0, this.layerCanvases[t].width, this.layerCanvases[t].height);
  }
  // Create or retrieve a cached texture for a canvas
  getTextureForCanvas(e) {
    const t = e === this.defaultLayerCanvas ? "default" : e.toString();
    if (!this.textureCache[t])
      this.textureCache[t] = this.texturePipelineResult.renderer.createTextureFromCanvas(e);
    else {
      const s = this.texturePipelineResult.gl;
      s.bindTexture(s.TEXTURE_2D, this.textureCache[t]), s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL, !0), s.texImage2D(s.TEXTURE_2D, 0, s.RGBA, s.RGBA, s.UNSIGNED_BYTE, e), s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL, !1);
    }
    return this.textureCache[t];
  }
  // Method to clear all elements and reset
  reset() {
    this.clear(), this.animationSegments = [], this.defaultLayerElements = [];
    for (const t in this.layerElements) {
      const s = this.layerLookup[t];
      s && s.cleanup(), this.layerElements[t] = [];
    }
    this.currentTime = 0, this.totalDuration = 0;
    const e = this.texturePipelineResult.gl;
    for (const t in this.textureCache)
      e.deleteTexture(this.textureCache[t]);
    this.textureCache = {}, this.clearPlayerState();
  }
  // Player state persistence methods
  savePlayerState() {
    var t, s;
    if (!((s = (t = window.mation) == null ? void 0 : t.options) != null && s.cacheState))
      return;
    const e = {
      currentTime: this.currentTime,
      isPlaying: this.isPlaying,
      totalDuration: this.totalDuration,
      zoom: this._zoom,
      pan: this._pan
    };
    try {
      localStorage.setItem(x.PLAYER_STATE_KEY, JSON.stringify(e));
    } catch (o) {
      console.warn("Failed to save player state:", o);
    }
  }
  restorePlayerState() {
    var e, t, s, o;
    if ((t = (e = window.mation) == null ? void 0 : e.options) != null && t.cacheState)
      try {
        const r = localStorage.getItem(x.PLAYER_STATE_KEY);
        if (r) {
          const n = JSON.parse(r);
          console.log("Found saved state:", n), n.isPlaying !== void 0 && !((o = (s = window.mation) == null ? void 0 : s.options) != null && o.autoplay) && (this.isPlaying = n.isPlaying, console.log(`Restored playing state: ${this.isPlaying}`)), n.currentTime !== void 0 && (this.currentTime = n.currentTime, console.log(`Stored time for later restoration: ${this.currentTime}`)), n.zoom !== void 0 && (this._zoom = n.zoom, console.log(`Restored zoom: ${this._zoom}`)), n.pan !== void 0 && (this._pan = n.pan, console.log(`Restored pan: ${this._pan}`));
        } else
          console.log("No saved player state found");
      } catch (r) {
        console.warn("Failed to restore player state:", r);
      }
  }
  clearPlayerState() {
    var e, t;
    if ((t = (e = window.mation) == null ? void 0 : e.options) != null && t.cacheState)
      try {
        localStorage.removeItem(x.PLAYER_STATE_KEY);
      } catch (s) {
        console.warn("Failed to clear player state:", s);
      }
  }
  apply(e) {
    e(this.ctx);
  }
  /**
   * Setup layers for the scene
   * This method can be implemented by any Scene subclass to define the layers
   * used in the animation.
   */
  setupLayers() {
  }
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
  *animationSequence() {
    throw new Error("animationSequence() must be implemented by Scene subclass");
  }
  // Method to run a sequence of animations and build the timeline
  async runSequence() {
    this.clear();
    const e = this.totalDuration, t = this.currentTime, s = this.isPlaying, o = this.currentTime;
    if (this.currentTime = 0, this.totalDuration = 0, this.animationSegments = [], this.lastRenderTime = 0, await this.buildAnimationTimeline(), t > 0 || o > 0) {
      const r = Math.max(t, o);
      e !== this.totalDuration && r > this.totalDuration ? this.currentTime = r >= e ? this.totalDuration : 0 : this.currentTime = Math.min(r, this.totalDuration);
    }
    return this.isPlaying = s, this.renderAtTime(this.currentTime), this.isPlaying && (this.lastRenderTime = performance.now(), this.startAnimationLoop()), this.savePlayerState(), Promise.resolve();
  }
  // Build timeline by running through the animation sequence once
  async buildAnimationTimeline() {
    this.ctx.save();
    const e = this.animationSequence();
    let t = e.next();
    for (; !t.done; )
      await t.value, t = e.next();
    this.ctx.restore(), console.log(`Animation timeline built with ${this.animationSegments.length} segments, total duration: ${this.totalDuration}s`);
  }
  // Animation control methods
  play() {
    this.isPlaying || (this.currentTime >= this.totalDuration && (this.currentTime = 0), this.isPlaying = !0, this.lastRenderTime = performance.now(), this.startAnimationLoop(), this.savePlayerState());
  }
  pause() {
    this.isPlaying && (this.isPlaying = !1, this.animationId && (cancelAnimationFrame(this.animationId), this.animationId = null), this.savePlayerState());
  }
  playing() {
    return this.isPlaying;
  }
  loop() {
    var e;
    return ((e = window.mation) == null ? void 0 : e.loop) || !1;
  }
  togglePlayPause() {
    this.isPlaying ? this.pause() : this.play();
  }
  getDuration() {
    return this.totalDuration;
  }
  getCurrentTime() {
    return this.currentTime;
  }
  // Queue a render request that will be processed at the target FPS
  queueRender() {
    this.renderQueued = !0, this.animationId || (this.lastRenderTime = performance.now(), this.animationId = requestAnimationFrame(this.renderLoop));
  }
  // Set the target FPS for rendering
  setTargetFPS(e) {
    this.targetFPS = Math.max(1, e), this.frameInterval = 1e3 / this.targetFPS / 1e3;
  }
  // Get the current target FPS
  getTargetFPS() {
    return this.targetFPS;
  }
  // Start the main animation loop
  startAnimationLoop() {
    this.animationId && cancelAnimationFrame(this.animationId), this.renderQueued = !0, this.renderLoop();
  }
  // Render the animation at a specific time
  renderAtTime(e) {
    const t = Math.max(0, Math.min(e, this.totalDuration));
    this.currentTime = t, this.clear();
    const s = this.animationSegments.filter((r) => r.startTime <= t);
    s.sort((r, n) => r.startTime - n.startTime);
    const o = /* @__PURE__ */ new Map();
    for (const r of s) {
      const n = t - r.startTime;
      let l;
      n >= r.duration ? l = 1 : (l = Math.max(0, Math.min(n / r.duration, 1)), l = r.easing(l));
      for (const h of r.elements)
        o.set(h, l);
    }
    this.renderFrame(o);
  }
  // Method to seek to a specific time
  seekToTime(e) {
    const t = Math.max(0, Math.min(e, this.totalDuration));
    this.currentTime = t, this.lastRenderTime = performance.now(), this.queueRender(), t >= this.totalDuration && (this.isPlaying = !1), this.savePlayerState();
  }
  // Getter and setter for performingPreviewAction
  setPerformingPreviewAction(e) {
    this.performingPreviewAction !== e && (this.performingPreviewAction = e, this.performingPreviewAction || this.queueRender());
  }
  getPerformingPreviewAction() {
    return this.performingPreviewAction;
  }
  // Core animation method - now updated to work with the timeline
  animate(e, t) {
    const s = this.currentTime, o = t.delay || 0, r = s + o, n = t.duration;
    for (const h of e)
      h.segmentStartTime = r, this.registerElement(h);
    const l = {
      startTime: r,
      duration: n,
      elements: [...e],
      easing: t.easing || ((h) => h)
      // Default to linear easing if not provided
    };
    this.animationSegments.push(l), this.totalDuration = Math.max(this.totalDuration, r + n), t != null && t.parallel || (this.currentTime = r + n);
  }
  renderElement(e, t, s) {
    e.update && e.update(s), e.draw(t, s, { layers: this.layerLookup });
  }
  renderFrame(e) {
    const t = this.currentTime, s = this.defaultLayerCanvas.getContext("2d");
    s.clearRect(0, 0, this.defaultLayerCanvas.width, this.defaultLayerCanvas.height), s.save(), s.translate(this.pan[0], this.pan[1]), s.scale(this.zoom, this.zoom), Object.keys(this.layerInitialProperties).forEach((n) => {
      const l = this.layerInitialProperties[n];
      if (l) {
        const h = this.layerLookup[n];
        Object.assign(h, l);
      }
    });
    for (const n of this.defaultLayerElements) {
      if (n.segmentStartTime !== void 0 && n.segmentStartTime > t)
        continue;
      const l = e.has(n) ? e.get(n) : 1;
      this.renderElement(n, s, l);
    }
    for (const n in this.layerElements) {
      const l = this.layerLookup[n];
      if (this.performingPreviewAction && !l.renderDuringPreviewAction) {
        const h = this.layerElements[n];
        for (const d of h) {
          if (d.segmentStartTime !== void 0 && d.segmentStartTime > t)
            continue;
          const g = e.has(d) ? e.get(d) : 1;
          this.renderElement(d, s, g);
        }
      }
    }
    const o = this.getTextureForCanvas(this.defaultLayerCanvas);
    this.texturePipelineResult.stage.set({
      u_texture: o,
      u_progress: 1
      // Always use full blending
    }), this.texturePipelineResult.renderer.setRenderTarget(null);
    const r = this.texturePipelineResult.gl;
    r.disable(r.SCISSOR_TEST), this.texturePipelineResult.render();
    for (const n of this.layers)
      if (!this.performingPreviewAction || n.renderDuringPreviewAction) {
        const l = this.layerCanvases[n.name], h = l.getContext("2d");
        h.clearRect(0, 0, l.width, l.height), h.save();
        const d = this.zoom, g = this.pan, f = (n.x ?? 0) * d + g[0], p = (n.y ?? 0) * d + g[1], y = (n.width ?? l.width) * d, T = (n.height ?? l.height) * d;
        if (n.isSubview)
          h.translate(g[0], g[1]), h.scale(d, d);
        else {
          const b = y / this.canvas.width, w = T / this.canvas.height;
          h.translate(f, p), h.scale(b, w);
        }
        const c = this.layerElements[n.name];
        for (const b of c) {
          if (b.segmentStartTime !== void 0 && b.segmentStartTime > t)
            continue;
          const w = e.has(b) ? e.get(b) : 1;
          this.renderElement(b, h, w);
        }
        h.restore();
        const m = this.getTextureForCanvas(l), u = this.texturePipelineResult.gl;
        u.enable(u.BLEND), u.blendFunc(u.SRC_ALPHA, u.ONE_MINUS_SRC_ALPHA), u.enable(u.SCISSOR_TEST), n.ignorePanZoom ? u.scissor(
          n.x ?? 0,
          n.y ?? 0,
          n.width ?? l.width,
          n.height ?? l.height
        ) : u.scissor(
          f,
          this.canvas.height - p - T,
          // WebGL has origin at bottom left
          y,
          T
        ), n.render(m, 1, this.performingPreviewAction), u.disable(u.BLEND), u.disable(u.SCISSOR_TEST);
      }
    s.restore();
  }
};
// 16.67ms for 60fps
// State persistence key
a(x, "PLAYER_STATE_KEY", "mation_player_state");
let _ = x;
const R = {
  // Linear
  linear: (i) => i,
  // Quadratic
  easeInQuad: (i) => i * i,
  easeOutQuad: (i) => i * (2 - i),
  easeInOutQuad: (i) => i < 0.5 ? 2 * i * i : -1 + (4 - 2 * i) * i,
  // Cubic
  easeInCubic: (i) => i * i * i,
  easeOutCubic: (i) => --i * i * i + 1,
  easeInOutCubic: (i) => i < 0.5 ? 4 * i * i * i : (i - 1) * (2 * i - 2) * (2 * i - 2) + 1,
  // Quartic
  easeInQuart: (i) => i * i * i * i,
  easeOutQuart: (i) => 1 - --i * i * i * i,
  easeInOutQuart: (i) => i < 0.5 ? 8 * i * i * i * i : 1 - 8 * --i * i * i * i,
  // Quintic
  easeInQuint: (i) => i * i * i * i * i,
  easeOutQuint: (i) => 1 + --i * i * i * i * i,
  easeInOutQuint: (i) => i < 0.5 ? 16 * i * i * i * i * i : 1 + 16 * --i * i * i * i * i,
  // Sinusoidal
  easeInSine: (i) => 1 - Math.cos(i * Math.PI / 2),
  easeOutSine: (i) => Math.sin(i * Math.PI / 2),
  easeInOutSine: (i) => -(Math.cos(Math.PI * i) - 1) / 2,
  // Exponential
  easeInExpo: (i) => i === 0 ? 0 : Math.pow(2, 10 * (i - 1)),
  easeOutExpo: (i) => i === 1 ? 1 : 1 - Math.pow(2, -10 * i),
  easeInOutExpo: (i) => i === 0 ? 0 : i === 1 ? 1 : i < 0.5 ? Math.pow(2, 20 * i - 10) / 2 : (2 - Math.pow(2, -20 * i + 10)) / 2,
  // Circular
  easeInCirc: (i) => 1 - Math.sqrt(1 - i * i),
  easeOutCirc: (i) => Math.sqrt(1 - --i * i),
  easeInOutCirc: (i) => i < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * i, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * i + 2, 2)) + 1) / 2,
  // Back (overshoots)
  easeInBack: (i) => i * i * ((1.70158 + 1) * i - 1.70158),
  easeOutBack: (i) => --i * i * ((1.70158 + 1) * i + 1.70158) + 1,
  easeInOutBack: (i) => {
    const e = 2.5949095;
    return (i *= 2) < 1 ? 0.5 * (i * i * ((e + 1) * i - e)) : 0.5 * ((i -= 2) * i * ((e + 1) * i + e) + 2);
  },
  // Elastic (bounces like a spring)
  easeInElastic: (i) => {
    if (i === 0)
      return 0;
    if (i === 1)
      return 1;
    const e = 0.3, t = e / (2 * Math.PI) * Math.asin(1);
    return -(Math.pow(2, 10 * (i -= 1)) * Math.sin((i - t) * (2 * Math.PI) / e));
  },
  easeOutElastic: (i) => {
    if (i === 0)
      return 0;
    if (i === 1)
      return 1;
    const e = 0.3, t = e / (2 * Math.PI) * Math.asin(1);
    return Math.pow(2, -10 * i) * Math.sin((i - t) * (2 * Math.PI) / e) + 1;
  },
  easeInOutElastic: (i) => {
    if (i === 0)
      return 0;
    if ((i *= 2) === 2)
      return 1;
    const e = 0.3 * 1.5, t = e / (2 * Math.PI) * Math.asin(1);
    return i < 1 ? -0.5 * (Math.pow(2, 10 * (i -= 1)) * Math.sin((i - t) * (2 * Math.PI) / e)) : Math.pow(2, -10 * (i -= 1)) * Math.sin((i - t) * (2 * Math.PI) / e) * 0.5 + 1;
  },
  // Bounce (decays bounces at the end)
  // Note: easeInBounce and easeInOutBounce depend on easeOutBounce
  easeOutBounce: (i) => i < 1 / 2.75 ? 7.5625 * i * i : i < 2 / 2.75 ? 7.5625 * (i -= 1.5 / 2.75) * i + 0.75 : i < 2.5 / 2.75 ? 7.5625 * (i -= 2.25 / 2.75) * i + 0.9375 : 7.5625 * (i -= 2.625 / 2.75) * i + 0.984375,
  easeInBounce: (i) => 1 - R.easeOutBounce(1 - i),
  easeInOutBounce: (i) => i < 0.5 ? (1 - R.easeOutBounce(1 - 2 * i)) / 2 : (1 + R.easeOutBounce(2 * i - 1)) / 2
};
function j(i) {
  return !!document.querySelector(`script[src*="${i}"]`);
}
function B() {
  const e = Array.from(document.getElementsByTagName("script")).find(
    (t) => t.src && (t.src.includes("mation.js") || t.src.includes("mation.min.js"))
  );
  if (e) {
    const t = new URL(e.src), s = t.pathname.split("/");
    return s.pop(), s.length === 0 ? "/" : `${t.origin}${s.join("/")}`;
  }
  return window.location.origin;
}
async function q(i) {
  return j(i) ? Promise.resolve() : new Promise((e, t) => {
    const s = document.createElement("script");
    s.src = i, s.async = !0, s.onload = () => e(), s.onerror = (o) => t(new Error(`Failed to load script: ${i}: ${o}`)), document.head.appendChild(s);
  });
}
async function W(i = {}) {
  const e = i.basePath || B();
  try {
    if (window.ffmpegInitialized && window.ffmpegInstance)
      return;
    const t = document.createElement("script");
    t.src = `${e}/libs/ffmpeg/ffmpeg.min.js`, await new Promise((s, o) => {
      t.onload = async () => {
        try {
          const { FFmpeg: r } = window.FFmpegWASM, n = new r();
          await n.load({
            coreURL: `${e}/libs/ffmpeg/ffmpeg-core.js`,
            wasmURL: `${e}/libs/ffmpeg/ffmpeg-core.wasm`
          }), window.ffmpegInstance = n, window.ffmpegInitialized = !0, console.log("FFmpeg loaded successfully"), s();
        } catch (r) {
          o(r);
        }
      }, t.onerror = () => o(new Error("Failed to load FFmpeg script")), document.head.appendChild(t);
    });
  } catch (t) {
    throw console.error("Failed to load FFmpeg:", t), t;
  }
}
async function V(i = {}) {
  const e = i.basePath || B();
  try {
    await q(`${e}/libs/jszip/jszip.min.js`), console.log("JSZip loaded successfully");
  } catch (t) {
    throw console.error("Failed to load JSZip:", t), t;
  }
}
async function Q(i = {}) {
  try {
    await Promise.all([
      W(i),
      V(i)
    ]), console.log("All rendering libraries loaded successfully");
  } catch (e) {
    throw console.error("Failed to load rendering libraries:", e), e;
  }
}
const F = 3005;
function H() {
  const i = ["mp4", "zip"];
  return (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") && i.push("node_mp4"), i;
}
async function L(i, e = {}) {
  await Q(e.libraryConfig);
  const {
    framerate: t = 60,
    codec: s = "libx264",
    outputFile: o = "out.mp4",
    onProgress: r,
    outputFormat: n = "mp4"
  } = e, l = i.getDuration(), h = [], d = 1 / t;
  for (let c = 0; c <= l + d; c += d)
    h.push(c);
  const g = i.playing();
  i.pause(), i.seekToTime(0);
  const f = 1 / h.length, p = [], y = [];
  for (let c = 0; c < h.length; c++) {
    i.renderAtTime(h[c]);
    const m = await new Promise(
      (b) => i.canvas.toBlob((w) => {
        b(w);
      })
    ), u = `frame_${c.toString().padStart(6, "0")}.png`;
    y.push(u), n === "mp4" ? window.ffmpegInstance.writeFile(u, new Uint8Array(await m.arrayBuffer())) : p.push(m), r && r((n === "mp4" ? 0.3 : 0.9) * (c * f));
  }
  if (r && r(n === "mp4" ? 0.3 : 0.9), n === "mp4") {
    const c = window.ffmpegInstance;
    c.on("progress", ({ progress: P }) => {
      if (r) {
        const E = 0.3 + P * 0.7;
        r(E);
      }
    }), c.on("log", (P) => {
      console.log(`ffmpeg log: ${JSON.stringify(P)}`);
    }), await c.exec([
      "-framerate",
      String(t),
      "-pattern_type",
      "glob",
      "-i",
      "*.png",
      "-c:v",
      s,
      "-preset",
      "medium",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "18",
      o
    ]), r && r(0.9);
    const m = await c.readFile(o), u = new Blob([m.buffer], { type: "video/mp4" }), b = URL.createObjectURL(u), w = document.createElement("a");
    w.href = b, w.download = o, document.body.appendChild(w), w.click(), document.body.removeChild(w), URL.revokeObjectURL(b);
  } else if (n === "node_mp4") {
    const c = `ws://${window.location.hostname}:${F}`;
    let m;
    try {
      m = new WebSocket(c), m.onopen = function() {
        r && r(0.1), m.send(JSON.stringify({
          type: "init",
          metadata: {
            framerate: t,
            codec: s,
            totalFrames: p.length
          }
        }));
      }, m.onmessage = async function(u) {
        const b = JSON.parse(u.data);
        switch (b.type) {
          case "init":
            r && r(0.15), await T(m, p);
            break;
          case "frame_received":
            if (r) {
              const E = 0.15 + (b.index + 1) / p.length * 0.7;
              r(E);
            }
            b.index === p.length - 1 && m.send(JSON.stringify({
              type: "render",
              framerate: t,
              codec: s
            }));
            break;
          case "render_started":
            r && r(0.85);
            break;
          case "progress":
            if (r) {
              const E = 0.85 + b.frame / b.totalFrames * 0.13;
              r(Math.min(E, 0.98));
            }
            break;
          case "completed":
            r && r(0.98);
            const w = `http://${window.location.hostname}:${F}${b.downloadUrl}`, P = document.createElement("a");
            P.href = w, P.download = o, document.body.appendChild(P), P.click(), document.body.removeChild(P), r && r(1), m.close();
            break;
          case "error":
            throw console.error("Server error:", b.message), new Error(`Server error: ${b.message}`);
        }
      }, m.onerror = function(u) {
        throw console.error("WebSocket error:", u), new Error("WebSocket connection error");
      }, await new Promise((u, b) => {
        m.onclose = u, m.onerror = b;
      });
    } catch (u) {
      throw console.error("Error in node_mp4 rendering:", u), m && m.readyState === WebSocket.OPEN && m.close(), u;
    }
  } else {
    const c = window.JSZip;
    if (!c)
      throw new Error("JSZip library is not loaded. Please include JSZip in your project.");
    const m = new c();
    for (let P = 0; P < p.length; P++)
      m.file(y[P], p[P]);
    const u = await m.generateAsync({ type: "blob" }), b = URL.createObjectURL(u), w = document.createElement("a");
    w.href = b, w.download = o.replace(/\.\w+$/, "") + ".zip", document.body.appendChild(w), w.click(), document.body.removeChild(w), URL.revokeObjectURL(b);
  }
  async function T(c, m) {
    for (let u = 0; u < m.length; u++) {
      for (; c.bufferedAmount > 1024 * 1024; )
        await new Promise((w) => setTimeout(w, 100));
      const b = await m[u].arrayBuffer();
      c.send(b), u % 10 === 0 && await new Promise((w) => setTimeout(w, 10));
    }
  }
  g && i.play(), r && r(1);
}
const K = `
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
function J() {
  const i = document.createElement("style");
  i.id = "mation-styles", i.textContent = K, document.head.appendChild(i);
}
function ee() {
  const i = document.getElementById("mation-styles");
  i && i.remove();
}
class se {
  constructor(e = {}) {
    a(this, "scene");
    a(this, "playPauseButton", null);
    a(this, "scrubber", null);
    a(this, "timeDisplay", null);
    a(this, "renderButton", null);
    a(this, "renderDropdown", null);
    a(this, "renderOptions", null);
    a(this, "dropdownToggle", null);
    a(this, "selectedFormat", "mp4");
    a(this, "progressContainer", null);
    a(this, "progressBar", null);
    a(this, "loopButton", null);
    a(this, "isPlaying", !0);
    a(this, "isDragging", !1);
    a(this, "wasPlayingBeforeDrag", !1);
    a(this, "isRendering", !1);
    a(this, "loop", !1);
    a(this, "options");
    a(this, "updateScrubber", () => {
      if (!this.isDragging && this.scrubber && this.scene) {
        const e = this.scene.getCurrentTime(), t = this.scene.getDuration();
        if (t > 0) {
          const s = Math.min(Math.floor(e / t * 1e3), 1e3);
          this.scrubber.value = s.toString(), this.updateTimeDisplay(e, t), e >= t && this.isPlaying && (this.isPlaying = !1, this.playPauseButton && (this.playPauseButton.textContent = "▶️"));
        }
      }
      requestAnimationFrame(this.updateScrubber);
    });
    this.options = {
      enableRendering: !1,
      injectStyles: !0,
      loop: !1,
      showUI: !1,
      cacheState: !1,
      autoplay: !1,
      enableZoom: !0,
      enablePan: !0,
      enableShortcuts: !0,
      ...e
    }, this.loop = this.options.loop || !1, this.isPlaying = this.options.autoplay || !1, this.options.injectStyles && J();
  }
  /**
   * Set the scene to be controlled by this Mation instance
   * @param scene Any object implementing the IScene interface
   */
  setScene(e) {
    this.scene = e;
  }
  setZoom(e, t) {
    e.setZoom(t);
  }
  setPan(e, t) {
    e.setPan(t);
  }
  getZoom(e) {
    return e.zoom;
  }
  getPan(e) {
    return e.pan;
  }
  setTargetFPS(e) {
    this.scene && this.scene.setTargetFPS(e);
  }
  queueRender() {
    this.scene && this.scene.queueRender();
  }
  async initialize(e) {
    if (!this.scene)
      throw Error("Can't initialize without a scene.");
    if (this.options.showUI && this.setupControls(e), (this.options.enableZoom || this.options.enablePan) && !this.options.showUI && this.setupZoomPanEvents(), this.scene) {
      await this.scene.runSequence();
      const t = this.scene.getDuration(), s = this.scene.getCurrentTime();
      this.options.showUI && this.updateTimeDisplay(s, t), this.isPlaying ? this.scene.play() : this.scene.pause(), this.options.showUI && this.playPauseButton && (this.playPauseButton.textContent = this.isPlaying ? "⏸️" : "▶️");
    }
    this.updateScrubber(), window.mation = this, window.render = async (t = "mp4") => {
      this.scene ? await L(this.scene, {
        outputFormat: t,
        libraryConfig: this.options.libraryConfig
      }) : console.error("No scene available to render");
    }, window.setTargetFPS = (t) => {
      this.scene && (this.scene.setTargetFPS(t), console.log(`Target FPS set to ${t}`));
    }, window.setLoop = (t) => {
      this.loop = t, this.loopButton && (this.loopButton.style.opacity = t ? "1.0" : "0.5", this.loopButton.title = t ? "Loop On" : "Loop Off");
    }, window.resetZoomPan = () => {
      if (this.scene) {
        const t = this.scene.canvas.width, s = this.scene.canvas.height;
        this.scene.setMousePosition(t / 2, s / 2), this.scene.setZoom(1), this.scene.setPan([0, 0]), this.scene.setPerformingPreviewAction(!1);
      }
    };
  }
  /**
   * Clean up and destroy the Mation instance
   * Call this when you're done with the Mation instance to clean up resources
   */
  destroy() {
    this.scene && this.scene.pause(), this.options.injectStyles && ee(), window.mation === this && (delete window.mation, delete window.render, delete window.setTargetFPS);
  }
  // Set up just the zoom and pan events without UI
  setupZoomPanEvents() {
    this.scene && (this.setupPanZoomEventListeners(), this.options.enableShortcuts && this.setupKeyboardShortcuts());
  }
  setupControls(e) {
    const t = document.createElement("div");
    t.className = "animation-controls", e.appendChild(t), this.playPauseButton = document.createElement("button"), this.playPauseButton.className = "play-pause-button", this.playPauseButton.textContent = "⏸️", t.appendChild(this.playPauseButton);
    const s = document.createElement("button");
    s.className = "reset-zoom-button", s.textContent = "🔍", s.title = "Reset Zoom", e.appendChild(s);
    const o = document.createElement("div");
    o.className = "scrubber-container", t.appendChild(o);
    const r = document.createElement("div");
    if (r.className = "right-controls-wrapper", o.appendChild(r), this.timeDisplay = document.createElement("div"), this.timeDisplay.className = "time-display", this.timeDisplay.textContent = "0.00 / 0.00", r.appendChild(this.timeDisplay), this.loopButton = document.createElement("button"), this.loopButton.className = "loop-button", this.loopButton.textContent = "🔁", this.loopButton.title = this.loop ? "Loop On" : "Loop Off", this.loopButton.style.opacity = this.loop ? "1.0" : "0.5", r.appendChild(this.loopButton), this.scrubber = document.createElement("input"), this.scrubber.type = "range", this.scrubber.min = "0", this.scrubber.max = "1000", this.scrubber.value = "0", this.scrubber.className = "scrubber", o.appendChild(this.scrubber), this.options.enableZoom || this.options.enablePan ? s.style.display = "flex" : s.style.display = "none", this.options.enableRendering) {
      this.renderDropdown = document.createElement("div"), this.renderDropdown.className = "render-dropdown", e.appendChild(this.renderDropdown);
      const n = document.createElement("div");
      n.className = "button-container", this.renderDropdown.appendChild(n), this.renderButton = document.createElement("button"), this.renderButton.className = "render-button", this.renderButton.textContent = "Render MP4", n.appendChild(this.renderButton), this.dropdownToggle = document.createElement("button"), this.dropdownToggle.className = "dropdown-toggle", this.dropdownToggle.innerHTML = "▼", n.appendChild(this.dropdownToggle), this.renderOptions = document.createElement("div"), this.renderOptions.className = "render-options", this.renderDropdown.appendChild(this.renderOptions);
      const l = H(), h = document.createElement("div");
      h.className = "render-option selected", h.textContent = "MP4 Video", h.dataset.format = "mp4", this.renderOptions.appendChild(h);
      const d = document.createElement("div");
      if (d.className = "render-option", d.textContent = "PNG Sequence (ZIP)", d.dataset.format = "zip", this.renderOptions.appendChild(d), l.includes("node_mp4")) {
        const g = document.createElement("div");
        g.className = "render-option", g.textContent = "Server MP4 (faster)", g.dataset.format = "node_mp4", this.renderOptions.appendChild(g);
      }
      this.progressContainer = document.createElement("div"), this.progressContainer.className = "progress-container", e.appendChild(this.progressContainer), this.progressBar = document.createElement("div"), this.progressBar.className = "progress-bar", this.progressContainer.appendChild(this.progressBar);
    }
    this.setupEventListeners();
  }
  setupPanZoomEventListeners() {
    var d, g, f, p, y, T;
    if (!this.scene)
      return;
    (d = this.scene.canvas) == null || d.addEventListener("mousemove", (c) => {
      if (!this.scene || !this.scene.canvas)
        return;
      const m = this.scene.canvas.getBoundingClientRect(), u = c.clientX - m.left, b = c.clientY - m.top;
      this.scene.setMousePosition(u, b);
    });
    let e = null;
    (g = this.scene.canvas) == null || g.addEventListener("wheel", (c) => {
      if (!this.scene || !this.options.enableZoom)
        return;
      c.preventDefault();
      const m = this.scene.canvas.getBoundingClientRect(), u = c.clientX - m.left, b = c.clientY - m.top;
      this.scene.setMousePosition(u, b);
      const w = this.scene.zoom;
      let P;
      c.deltaY > 0 ? P = Math.max(0.05, w / 1.1) : P = Math.min(10, w * 1.1), this.scene.setZoom(P), this.scene.setPerformingPreviewAction(!0), e !== null && clearTimeout(e), e = window.setTimeout(() => {
        this.scene && this.scene.setPerformingPreviewAction(!1), e = null;
      }, 200);
    }, { passive: !1 });
    let t = !1, s = 0, o = 0;
    (f = this.scene.canvas) == null || f.addEventListener("mousedown", (c) => {
      !this.scene || !this.options.enablePan || c.altKey && (this.scene.setPerformingPreviewAction(!0), t = !0, s = c.clientX, o = c.clientY);
    }), (p = this.scene.canvas) == null || p.addEventListener("mousemove", (c) => {
      if (!this.scene || !t || !this.options.enablePan)
        return;
      const m = c.clientX - s, u = c.clientY - o, [b, w] = this.scene.pan;
      this.scene.setPan([b + m, w + u]), s = c.clientX, o = c.clientY;
    }), document.addEventListener("mouseup", () => {
      var c;
      t && (t = !1, (c = this.scene) == null || c.setPerformingPreviewAction(!1));
    });
    let r = 0, n = 1, l = 0, h = 0;
    (y = this.scene.canvas) == null || y.addEventListener("touchstart", (c) => {
      if (this.scene && c.touches.length === 2) {
        const m = c.touches[0], u = c.touches[1];
        r = Math.hypot(
          u.clientX - m.clientX,
          u.clientY - m.clientY
        ), n = this.scene.zoom, l = (m.clientX + u.clientX) / 2, h = (m.clientY + u.clientY) / 2;
      }
    }), (T = this.scene.canvas) == null || T.addEventListener("touchmove", (c) => {
      if (this.scene && c.touches.length === 2) {
        c.preventDefault();
        const m = c.touches[0], u = c.touches[1], b = this.options.enableZoom, w = this.options.enablePan;
        if (!b && !w)
          return;
        const P = (m.clientX + u.clientX) / 2, E = (m.clientY + u.clientY) / 2, S = this.scene.canvas.getBoundingClientRect(), I = P - S.left, D = E - S.top;
        if (this.scene.setMousePosition(I, D), b) {
          const v = Math.hypot(
            u.clientX - m.clientX,
            u.clientY - m.clientY
          ) / r;
          this.scene.setZoom(n * v);
        }
        if (w) {
          const C = P - l, v = E - h, [M, O] = this.scene.pan;
          this.scene.setPan([M + C, O + v]), l = P, h = E;
        }
      }
    }, { passive: !1 });
  }
  setupEventListeners() {
    var t, s, o, r, n, l, h, d;
    this.setupPanZoomEventListeners(), this.options.enableShortcuts && this.setupKeyboardShortcuts(), (t = this.playPauseButton) == null || t.addEventListener("click", () => {
      this.scene && (this.isPlaying ? (this.scene.pause(), this.playPauseButton && (this.playPauseButton.textContent = "▶️")) : (this.scene.getCurrentTime() >= this.scene.getDuration() && this.scene.seekToTime(0), this.scene.play(), this.playPauseButton && (this.playPauseButton.textContent = "⏸️")), this.isPlaying = !this.isPlaying);
    }), (s = this.loopButton) == null || s.addEventListener("click", () => {
      this.loop = !this.loop, this.loopButton && (this.loopButton.style.opacity = this.loop ? "1.0" : "0.5", this.loopButton.title = this.loop ? "Loop On" : "Loop Off");
    });
    const e = document.querySelector(".reset-zoom-button");
    e == null || e.addEventListener("click", () => {
      if (!this.scene)
        return;
      const g = this.scene.canvas.width, f = this.scene.canvas.height;
      this.scene.setMousePosition(g / 2, f / 2), this.scene.setZoom(1), this.scene.setPan([0, 0]), this.scene.setPerformingPreviewAction(!1);
    }), (o = this.scrubber) == null || o.addEventListener("mousedown", () => {
      this.scene && (this.isDragging = !0, this.wasPlayingBeforeDrag = this.isPlaying, this.scene.pause(), this.scene.setPerformingPreviewAction(!0));
    }), (r = this.scrubber) == null || r.addEventListener("touchstart", () => {
      this.scene && (this.isDragging = !0, this.wasPlayingBeforeDrag = this.isPlaying, this.scene.pause(), this.scene.setPerformingPreviewAction(!0));
    }), document.addEventListener("mouseup", () => {
      this.scene && this.isDragging && (this.isDragging = !1, this.scene.setPerformingPreviewAction(!1), this.wasPlayingBeforeDrag && (this.scene.play(), this.isPlaying = !0, this.playPauseButton && (this.playPauseButton.textContent = "⏸️")));
    }), document.addEventListener("touchend", () => {
      this.scene && this.isDragging && (this.isDragging = !1, this.scene.setPerformingPreviewAction(!1), this.wasPlayingBeforeDrag && (this.scene.play(), this.isPlaying = !0, this.playPauseButton && (this.playPauseButton.textContent = "⏸️")));
    }), (n = this.scrubber) == null || n.addEventListener("input", () => {
      if (!this.scene || !this.scrubber)
        return;
      const g = parseInt(this.scrubber.value, 10), f = this.scene.getDuration(), p = g / 1e3 * f;
      this.scene.seekToTime(p), this.updateTimeDisplay(p, f);
    }), this.options.enableRendering && ((l = this.dropdownToggle) == null || l.addEventListener("click", () => {
      this.isRendering || this.renderOptions && this.renderOptions.classList.toggle("visible");
    }), (h = this.renderOptions) == null || h.addEventListener("click", (g) => {
      var p, y;
      const f = g.target;
      if (f.classList.contains("render-option")) {
        const T = f.dataset.format;
        this.selectedFormat = T;
        const c = (p = this.renderOptions) == null ? void 0 : p.querySelectorAll(".render-option");
        c == null || c.forEach((m) => m.classList.remove("selected")), f.classList.add("selected"), this.renderButton && (T === "mp4" ? this.renderButton.textContent = "Render MP4" : T === "zip" ? this.renderButton.textContent = "Render PNGs" : T === "node_mp4" && (this.renderButton.textContent = "Render Server MP4")), (y = this.renderOptions) == null || y.classList.remove("visible");
      }
    }), document.addEventListener("click", (g) => {
      var f;
      (f = this.renderOptions) != null && f.classList.contains("visible") && this.dropdownToggle && !(g.target === this.dropdownToggle || this.dropdownToggle.contains(g.target)) && !(g.target === this.renderOptions || this.renderOptions.contains(g.target)) && this.renderOptions.classList.remove("visible");
    }), (d = this.renderButton) == null || d.addEventListener("click", async () => {
      var g;
      if (!(!this.scene || this.isRendering || !this.renderButton || !this.progressContainer || !this.progressBar)) {
        (g = this.renderOptions) != null && g.classList.contains("visible") && this.renderOptions.classList.remove("visible"), this.isRendering = !0, this.renderButton.disabled = !0, this.renderButton.textContent = "Rendering...", this.progressContainer.classList.add("visible"), this.progressBar.style.width = "0%";
        try {
          await L(this.scene, {
            onProgress: (f) => {
              this.progressBar && (this.progressBar.style.width = `${f * 100}%`);
            },
            outputFormat: this.selectedFormat,
            libraryConfig: this.options.libraryConfig
          }), this.renderButton && (this.renderButton.textContent = "Render Complete!"), setTimeout(() => {
            this.renderButton && (this.selectedFormat === "mp4" ? this.renderButton.textContent = "Render MP4" : this.selectedFormat === "zip" ? this.renderButton.textContent = "Render PNGs" : this.selectedFormat === "node_mp4" && (this.renderButton.textContent = "Render Server MP4"), this.renderButton.disabled = !1), this.progressContainer && this.progressContainer.classList.remove("visible");
          }, 3e3);
        } catch (f) {
          console.error("Rendering failed:", f), this.renderButton && (this.renderButton.textContent = "Render Failed"), setTimeout(() => {
            this.renderButton && (this.selectedFormat === "mp4" ? this.renderButton.textContent = "Render MP4" : this.selectedFormat === "zip" ? this.renderButton.textContent = "Render PNGs" : this.selectedFormat === "node_mp4" && (this.renderButton.textContent = "Render Server MP4"), this.renderButton.disabled = !1), this.progressContainer && this.progressContainer.classList.remove("visible");
          }, 3e3);
        }
        this.isRendering = !1;
      }
    }));
  }
  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (!this.scene || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        return;
      if (e.key === "Escape") {
        const r = this.scene.canvas.width, n = this.scene.canvas.height;
        this.scene.setMousePosition(r / 2, n / 2), this.scene.setZoom(1), this.scene.setPan([0, 0]), this.scene.setPerformingPreviewAction(!1);
      }
      e.key === " " && (e.preventDefault(), this.isPlaying ? (this.scene.pause(), this.playPauseButton && (this.playPauseButton.textContent = "▶️")) : (this.scene.getCurrentTime() >= this.scene.getDuration() && this.scene.seekToTime(0), this.scene.play(), this.playPauseButton && (this.playPauseButton.textContent = "⏸️")), this.isPlaying = !this.isPlaying);
      const s = 1 / this.scene.getTargetFPS(), o = s * 60;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault(), this.isPlaying && (this.scene.pause(), this.isPlaying = !1, this.playPauseButton && (this.playPauseButton.textContent = "▶️"));
        const n = this.scene.getCurrentTime(), l = this.scene.getDuration();
        let h;
        const d = e.shiftKey ? o : s;
        if (e.key === "ArrowLeft" ? h = Math.max(0, n - d) : h = Math.min(l, n + d), this.scene.seekToTime(h), this.updateTimeDisplay(h, l), this.scrubber) {
          const g = Math.min(Math.floor(h / l * 1e3), 1e3);
          this.scrubber.value = g.toString();
        }
      }
    });
  }
  updateTimeDisplay(e, t) {
    this.timeDisplay && (this.timeDisplay.textContent = `${e.toFixed(2)}s / ${t.toFixed(2)}s`);
  }
}
export {
  R as Easing,
  ie as Layer,
  se as Mation,
  _ as Scene,
  z as WebGLPipeline,
  G as createPipeline,
  se as default,
  H as getAvailableFormats,
  J as injectStyles,
  W as loadFFmpeg,
  V as loadJSZip,
  Q as loadRenderingLibraries,
  ee as removeStyles,
  L as renderToVideo
};
//# sourceMappingURL=mation.js.map
