var K = Object.defineProperty;
var ee = (s, e, t) => e in s ? K(s, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : s[e] = t;
var a = (s, e, t) => (ee(s, typeof e != "symbol" ? e + "" : e, t), t);
const A = `#version 300 es
precision highp float;
precision highp int;
`, te = `in vec2 position;
out vec2 vUv;
void main() {
    vUv = 0.5 * (position + 1.0);
    gl_Position = vec4(position, 0.0, 1.0);
}`;
class se {
  constructor(e, t, i) {
    a(this, "vertexShader");
    a(this, "fragmentShader");
    a(this, "program");
    a(this, "quad");
    a(this, "name");
    a(this, "w");
    a(this, "uniforms");
    const { fragmentShader: o, vertexShader: r, uniforms: n, name: l } = i;
    this.vertexShader = r ?? te, this.fragmentShader = o, this.program = e.createProgram(
      `${A}${this.vertexShader}`,
      `${A}${this.fragmentShader}`
    ), this.uniforms = n, this.quad = t, this.name = l || "", e.programs.set(l || "", this.program), this.w = e;
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
    e != null && e.uniforms && this.set(e.uniforms), typeof (e == null ? void 0 : e.renderTarget) < "u" ? this.w.setRenderTarget(e.renderTarget) : this.w.setRenderTarget(null), this.w.render(
      this.name,
      this.uniforms,
      { position: this.quad }
    );
  }
}
class ie {
  constructor(e, t) {
    a(this, "w");
    a(this, "quad");
    a(this, "passes");
    this.w = e, this.quad = t, this.passes = {};
  }
  add(e, t = {}, i = {}) {
    const o = i.dpr || window.devicePixelRatio || 1, r = i.scale ? o : 1, n = this.w, l = this.w.canvas, h = this.w.canvas.width, u = this.w.canvas.height;
    n.gl.viewport(0, 0, l.width, l.height);
    const E = {
      minFilter: n.gl.NEAREST,
      magFilter: n.gl.NEAREST,
      internalFormat: n.gl.RGBA16F,
      format: n.gl.RGBA,
      type: n.gl.HALF_FLOAT,
      ...t
    }, y = (i == null ? void 0 : i.renderTargetCount) ?? 2, m = [];
    for (let x = 0; x < y; x++)
      m.push(
        n.createRenderTarget(h * r, u * r, E)
      );
    const T = this.createPass(e);
    return {
      canvas: l,
      render: (x) => {
        T.render({ uniforms: x == null ? void 0 : x.uniforms, renderTarget: x == null ? void 0 : x.renderTarget });
      },
      renderTargets: m,
      renderer: n,
      scaling: o,
      uniforms: T.uniforms,
      gl: this.gl(),
      stage: T
    };
  }
  createPass(e) {
    const { name: t } = e, i = `pass-${Object.keys(this.passes).length}:-${t ?? ""}`, o = new se(
      this.w,
      this.quad,
      {
        ...e,
        name: i
      }
    );
    return this.passes[i] = o, o;
  }
  gl() {
    return this.w.gl;
  }
}
class re {
  constructor(e, t, i, o) {
    a(this, "gl");
    a(this, "name");
    a(this, "texture");
    a(this, "framebuffer");
    this.gl = e, this.name = t, this.texture = i, this.framebuffer = o;
  }
  updateFilters({ minFilter: e, magFilter: t }) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, e), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, t), this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }
}
class ne {
  constructor(e, t) {
    a(this, "canvas");
    a(this, "gl");
    a(this, "programs");
    a(this, "framebuffers");
    a(this, "defaultRenderTargetProps");
    a(this, "renderTargets");
    this.canvas = e;
    const i = (t == null ? void 0 : t.dpr) ?? (window.devicePixelRatio || 1), o = (t == null ? void 0 : t.canvasScale) ?? 1 / i, r = e.width, n = e.height;
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
  }
  createProgram(e, t) {
    const i = this.createShader(this.gl.VERTEX_SHADER, e), o = this.createShader(this.gl.FRAGMENT_SHADER, t), r = this.gl.createProgram();
    if (!r)
      throw new Error("Failed to create WebGL program");
    if (this.gl.attachShader(r, i), this.gl.attachShader(r, o), this.gl.linkProgram(r), !this.gl.getProgramParameter(r, this.gl.LINK_STATUS))
      throw new Error("Unable to initialize the shader program: " + this.gl.getProgramInfoLog(r));
    return r;
  }
  addLineNumbers(e) {
    return e.split(`
`).map((t, i) => `${i + 1}: ${t}`).join(`
`);
  }
  createShader(e, t) {
    const i = this.gl.createShader(e);
    if (!i)
      throw new Error("Failed to create WebGL shader");
    if (this.gl.shaderSource(i, t), this.gl.compileShader(i), !this.gl.getShaderParameter(i, this.gl.COMPILE_STATUS))
      throw new Error("An error occurred compiling the shaders: " + this.gl.getShaderInfoLog(i) + `
${this.addLineNumbers(t)}`);
    return i;
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
    const t = this.gl, i = t.createTexture();
    if (!i)
      throw new Error("Failed to create WebGL texture");
    if (!e.getContext("2d"))
      throw new Error("Failed to get 2D context");
    return t.bindTexture(t.TEXTURE_2D, i), t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !1), t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL, !0), t.texImage2D(t.TEXTURE_2D, 0, t.RGBA, t.RGBA, t.UNSIGNED_BYTE, e), t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL, !1), t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !1), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_WRAP_S, t.CLAMP_TO_EDGE), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_WRAP_T, t.CLAMP_TO_EDGE), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_MIN_FILTER, t.NEAREST), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_MAG_FILTER, t.NEAREST), t.bindTexture(t.TEXTURE_2D, null), i;
  }
  createRenderTarget(e, t, i = {}, o) {
    const {
      // generateMipmaps,
      minFilter: r,
      magFilter: n,
      internalFormat: l,
      format: h,
      type: u
    } = {
      ...this.defaultRenderTargetProps,
      ...i
    }, E = o ?? `rt-${Object.keys(this.renderTargets).length}`, y = this.gl.createFramebuffer();
    if (!y)
      throw new Error("Failed to create framebuffer");
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, y);
    const m = this.gl.createTexture();
    if (!m)
      throw new Error("Failed to create texture");
    this.gl.bindTexture(this.gl.TEXTURE_2D, m), this.gl.texImage2D(this.gl.TEXTURE_2D, 0, l, e, t, 0, h, u, null), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, r), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, n), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE), this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, m, 0);
    const T = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
    if (T !== this.gl.FRAMEBUFFER_COMPLETE)
      throw new Error("Framebuffer is not complete: " + T);
    return this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null), this.gl.bindTexture(this.gl.TEXTURE_2D, null), this.framebuffers.set(E, { framebuffer: y, texture: m, width: e, height: t }), this.renderTargets[E] = new re(
      this.gl,
      E,
      m,
      y
    ), this.renderTargets[E];
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
  setUniform(e, t, i, o, r, n) {
    const l = e.getUniformLocation(o, r);
    if (l === null)
      return;
    let h = null;
    for (let m = 0; m < i; m++) {
      const T = e.getActiveUniform(o, m);
      if (T && T.name === r) {
        h = T;
        break;
      }
    }
    if (!h) {
      console.warn(`Unable to find uniform info for "${r}"`);
      return;
    }
    const { type: u, size: E } = h;
    function y(m, T) {
      return m instanceof T ? m : new T(m);
    }
    switch (u) {
      case e.FLOAT:
        e.uniform1f(l, n);
        break;
      case e.INT:
      case e.BOOL:
        e.uniform1i(l, n);
        break;
      case e.FLOAT_VEC2:
        e.uniform2fv(l, y(n, Float32Array));
        break;
      case e.FLOAT_VEC3:
        e.uniform3fv(l, y(n, Float32Array));
        break;
      case e.FLOAT_VEC4:
        e.uniform4fv(l, y(n, Float32Array));
        break;
      case e.INT_VEC2:
      case e.BOOL_VEC2:
        e.uniform2iv(l, y(n, Int32Array));
        break;
      case e.INT_VEC3:
      case e.BOOL_VEC3:
        e.uniform3iv(l, y(n, Int32Array));
        break;
      case e.INT_VEC4:
      case e.BOOL_VEC4:
        e.uniform4iv(l, y(n, Int32Array));
        break;
      case e.FLOAT_MAT2:
        e.uniformMatrix2fv(l, !1, y(n, Float32Array));
        break;
      case e.FLOAT_MAT3:
        e.uniformMatrix3fv(l, !1, y(n, Float32Array));
        break;
      case e.FLOAT_MAT4:
        e.uniformMatrix4fv(l, !1, y(n, Float32Array));
        break;
      case e.SAMPLER_2D:
      case e.SAMPLER_CUBE:
        const m = t.length;
        this.gl.activeTexture(this.gl.TEXTURE0 + m), t.push(m), this.gl.bindTexture(this.gl.TEXTURE_2D, n), this.gl.uniform1i(l, m), n != null && this.gl.generateMipmap(this.gl.TEXTURE_2D);
        break;
      default:
        u === e.FLOAT && E > 1 ? e.uniform1fv(l, y(n, Float32Array)) : (u === e.INT || u === e.BOOL) && E > 1 ? e.uniform1iv(l, y(n, Int32Array)) : console.warn(`Unsupported uniform type: ${u}`);
        break;
    }
  }
  render(e, t = {}, i = {}) {
    const o = this.programs.get(e);
    if (!o)
      throw new Error(`Program "${e}" not found`);
    this.gl.useProgram(o);
    const r = [], n = this.gl.getProgramParameter(o, this.gl.ACTIVE_UNIFORMS);
    for (const [l, h] of Object.entries(t))
      this.setUniform(this.gl, r, n, o, l, h);
    for (const [l, h] of Object.entries(i)) {
      const u = this.gl.getAttribLocation(o, l);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, h.buffer), this.gl.enableVertexAttribArray(u), this.gl.vertexAttribPointer(u, h.size, this.gl.FLOAT, !1, 0, 0);
    }
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
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
  createPipeline() {
    const e = this.createFullscreenQuad();
    return new ie(this, e);
  }
  cleanup() {
    this.clear();
  }
}
function ae(s) {
  return new ne(s).createPipeline();
}
class ye {
  constructor(e, t, i, o = {}) {
    a(this, "name");
    a(this, "x");
    a(this, "y");
    a(this, "width");
    a(this, "height");
    a(this, "isSubview");
    a(this, "renderWhenScrubbing");
    a(this, "extras");
    a(this, "pipeline");
    a(this, "ignorePanZoom");
    a(this, "render");
    this.name = e, this.pipeline = t, this.render = i, this.x = o.x, this.y = o.y, this.width = o.width, this.height = o.height, this.isSubview = o.isSubview, this.renderWhenScrubbing = o.renderWhenScrubbing, this.ignorePanZoom = o.ignorePanZoom, this.extras = o.extras;
  }
  cleanup() {
    this.pipeline.w.cleanup();
  }
}
const oe = {
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
}, L = class L {
  constructor({ canvas: e, width: t, height: i }) {
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
    a(this, "forceDefaultLayerOnly", !1);
    a(this, "renderQueued", !1);
    a(this, "targetFPS", 60);
    a(this, "frameInterval", 1e3 / 60 / 1e3);
    // Main render loop that respects target FPS
    a(this, "renderLoop", () => {
      const e = performance.now(), t = e - this.lastRenderTime;
      if (t >= this.frameInterval || this.lastRenderTime === 0)
        if (this.lastRenderTime = e, this.isPlaying) {
          const i = t / 1e3, o = this.currentTime;
          this.currentTime = Math.min(this.currentTime + i, this.totalDuration), this.renderAtTime(this.currentTime), this.savePlayerState(), this.onFrame && this.onFrame(), this.currentTime >= this.totalDuration && (this.isPlaying = !1, o < this.totalDuration && this.renderAtTime(this.totalDuration), this.savePlayerState());
        } else
          this.renderQueued && (this.renderAtTime(this.currentTime), this.renderQueued = !1);
      this.isPlaying && (this.renderQueued = !0), this.isPlaying || this.renderQueued ? this.animationId = requestAnimationFrame(this.renderLoop) : this.animationId = null;
    });
    this.canvas = e, this.canvas.width = t, this.canvas.height = i, this.width = t, this.height = i;
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
    const [t, i] = this.mousePosition, o = (t - this._pan[0]) / this._zoom, r = (i - this._pan[1]) / this._zoom;
    this._zoom = e;
    const n = t - o * this._zoom, l = i - r * this._zoom;
    this._pan[0] = n, this._pan[1] = l, this.queueRender(), this.savePlayerState();
  }
  setPan(e) {
    this._pan = e, this.setForceDefaultLayerOnly(!0), this.queueRender(), this.savePlayerState();
  }
  initialize() {
    const e = new OffscreenCanvas(this.width, this.height);
    e.width = this.width, e.height = this.height;
    const t = e.getContext("2d");
    if (!t)
      throw new Error("Failed to get 2D context");
    this.ctx = t;
    const i = ae(this.canvas);
    return this.texturePipelineResult = i.add(oe), this.defaultLayerCanvas = new OffscreenCanvas(this.canvas.width, this.canvas.height), this.setupLayers(), this.restorePlayerState(), {
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
      renderWhenScrubbing: t.renderWhenScrubbing,
      extras: t.extras ? { ...t.extras } : void 0
    }, this.layerLookup[t.name] = t, this.layers.splice(e, 0, t), this.layerElements[t.name] = [];
    const i = t.width ?? this.canvas.width, o = t.height ?? this.canvas.height;
    this.layerCanvases[t.name] = new OffscreenCanvas(i, o);
  }
  pushLayer(e) {
    this.layerInitialProperties[e.name] = {
      x: e.x,
      y: e.y,
      width: e.width,
      height: e.height,
      isSubview: e.isSubview,
      renderWhenScrubbing: e.renderWhenScrubbing,
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
      const i = this.texturePipelineResult.gl;
      i.bindTexture(i.TEXTURE_2D, this.textureCache[t]), i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL, !0), i.texImage2D(i.TEXTURE_2D, 0, i.RGBA, i.RGBA, i.UNSIGNED_BYTE, e), i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL, !1);
    }
    return this.textureCache[t];
  }
  // Method to clear all elements and reset
  reset() {
    this.clear(), this.animationSegments = [], this.defaultLayerElements = [];
    for (const t in this.layerElements) {
      const i = this.layerLookup[t];
      i && i.cleanup(), this.layerElements[t] = [];
    }
    this.currentTime = 0, this.totalDuration = 0;
    const e = this.texturePipelineResult.gl;
    for (const t in this.textureCache)
      e.deleteTexture(this.textureCache[t]);
    this.textureCache = {}, this.clearPlayerState();
  }
  // Player state persistence methods
  savePlayerState() {
    const e = {
      currentTime: this.currentTime,
      isPlaying: this.isPlaying,
      totalDuration: this.totalDuration,
      zoom: this._zoom,
      pan: this._pan
    };
    try {
      localStorage.setItem(L.PLAYER_STATE_KEY, JSON.stringify(e));
    } catch (t) {
      console.warn("Failed to save player state:", t);
    }
  }
  restorePlayerState() {
    try {
      const e = localStorage.getItem(L.PLAYER_STATE_KEY);
      if (e) {
        const t = JSON.parse(e);
        console.log("Found saved state:", t), t.isPlaying !== void 0 && (this.isPlaying = t.isPlaying, console.log(`Restored playing state: ${this.isPlaying}`)), t.currentTime !== void 0 && (this.currentTime = t.currentTime, console.log(`Stored time for later restoration: ${this.currentTime}`)), t.zoom !== void 0 && (this._zoom = t.zoom, console.log(`Restored zoom: ${this._zoom}`)), t.pan !== void 0 && (this._pan = t.pan, console.log(`Restored pan: ${this._pan}`));
      } else
        console.log("No saved player state found");
    } catch (e) {
      console.warn("Failed to restore player state:", e);
    }
  }
  clearPlayerState() {
    try {
      localStorage.removeItem(L.PLAYER_STATE_KEY);
    } catch (e) {
      console.warn("Failed to clear player state:", e);
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
    const e = this.totalDuration, t = this.currentTime, i = this.isPlaying, o = this.currentTime;
    if (this.currentTime = 0, this.totalDuration = 0, this.animationSegments = [], this.lastRenderTime = 0, await this.buildAnimationTimeline(), t > 0 || o > 0) {
      const r = Math.max(t, o);
      e !== this.totalDuration && r > this.totalDuration ? this.currentTime = r >= e ? this.totalDuration : 0 : this.currentTime = Math.min(r, this.totalDuration);
    }
    return this.isPlaying = i, this.renderAtTime(this.currentTime), this.isPlaying && (this.lastRenderTime = performance.now(), this.startAnimationLoop()), this.savePlayerState(), Promise.resolve();
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
  // Start the main animation loop
  startAnimationLoop() {
    this.animationId && cancelAnimationFrame(this.animationId), this.renderQueued = !0, this.renderLoop();
  }
  // Render the animation at a specific time
  renderAtTime(e) {
    const t = Math.max(0, Math.min(e, this.totalDuration));
    this.currentTime = t, this.clear();
    const i = this.animationSegments.filter((r) => r.startTime <= t);
    i.sort((r, n) => r.startTime - n.startTime);
    const o = /* @__PURE__ */ new Map();
    for (const r of i) {
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
  // Getter and setter for forceDefaultLayerOnly
  setForceDefaultLayerOnly(e) {
    this.forceDefaultLayerOnly !== e && (this.forceDefaultLayerOnly = e, this.forceDefaultLayerOnly || this.queueRender());
  }
  getForceDefaultLayerOnly() {
    return this.forceDefaultLayerOnly;
  }
  // Core animation method - now updated to work with the timeline
  animate(e, t) {
    const i = this.currentTime, o = t.delay || 0, r = i + o, n = t.duration;
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
  // We don't need the startAnimation method any more as we're using the timeline-based approach
  renderElement(e, t, i) {
    e.update && e.update(i), e.draw(t, i, { layers: this.layerLookup });
  }
  renderFrame(e) {
    const t = this.currentTime, i = this.defaultLayerCanvas.getContext("2d");
    i.clearRect(0, 0, this.defaultLayerCanvas.width, this.defaultLayerCanvas.height), i.save(), i.translate(this.pan[0], this.pan[1]), i.scale(this.zoom, this.zoom), Object.keys(this.layerInitialProperties).forEach((n) => {
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
      this.renderElement(n, i, l);
    }
    for (const n in this.layerElements) {
      const l = this.layerLookup[n];
      if (this.forceDefaultLayerOnly && !l.renderWhenScrubbing) {
        const h = this.layerElements[n];
        for (const u of h) {
          if (u.segmentStartTime !== void 0 && u.segmentStartTime > t)
            continue;
          const E = e.has(u) ? e.get(u) : 1;
          this.renderElement(u, i, E);
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
      if (!this.forceDefaultLayerOnly || n.renderWhenScrubbing) {
        const l = this.layerCanvases[n.name], h = l.getContext("2d");
        h.clearRect(0, 0, l.width, l.height), h.save();
        const u = this.zoom, E = this.pan, y = (n.x ?? 0) * u + E[0], m = (n.y ?? 0) * u + E[1], T = (n.width ?? l.width) * u, x = (n.height ?? l.height) * u;
        if (n.isSubview)
          h.translate(E[0], E[1]), h.scale(u, u);
        else {
          const g = T / this.canvas.width, w = x / this.canvas.height;
          h.translate(y, m), h.scale(g, w);
        }
        const b = this.layerElements[n.name];
        for (const g of b) {
          if (g.segmentStartTime !== void 0 && g.segmentStartTime > t)
            continue;
          const w = e.has(g) ? e.get(g) : 1;
          this.renderElement(g, h, w);
        }
        h.restore();
        const p = this.getTextureForCanvas(l), d = this.texturePipelineResult.gl;
        d.enable(d.BLEND), d.blendFunc(d.SRC_ALPHA, d.ONE_MINUS_SRC_ALPHA), d.enable(d.SCISSOR_TEST), n.ignorePanZoom ? d.scissor(
          n.x ?? 0,
          n.y ?? 0,
          n.width ?? l.width,
          n.height ?? l.height
        ) : d.scissor(
          y,
          this.canvas.height - m - x,
          // WebGL has origin at bottom left
          T,
          x
        ), n.render(p, 1), d.disable(d.BLEND), d.disable(d.SCISSOR_TEST);
      }
    i.restore();
  }
};
// 16.67ms for 60fps
// State persistence key
a(L, "PLAYER_STATE_KEY", "mation_player_state");
let $ = L;
const D = {
  // Linear
  linear: (s) => s,
  // Quadratic
  easeInQuad: (s) => s * s,
  easeOutQuad: (s) => s * (2 - s),
  easeInOutQuad: (s) => s < 0.5 ? 2 * s * s : -1 + (4 - 2 * s) * s,
  // Cubic
  easeInCubic: (s) => s * s * s,
  easeOutCubic: (s) => --s * s * s + 1,
  easeInOutCubic: (s) => s < 0.5 ? 4 * s * s * s : (s - 1) * (2 * s - 2) * (2 * s - 2) + 1,
  // Quartic
  easeInQuart: (s) => s * s * s * s,
  easeOutQuart: (s) => 1 - --s * s * s * s,
  easeInOutQuart: (s) => s < 0.5 ? 8 * s * s * s * s : 1 - 8 * --s * s * s * s,
  // Quintic
  easeInQuint: (s) => s * s * s * s * s,
  easeOutQuint: (s) => 1 + --s * s * s * s * s,
  easeInOutQuint: (s) => s < 0.5 ? 16 * s * s * s * s * s : 1 + 16 * --s * s * s * s * s,
  // Sinusoidal
  easeInSine: (s) => 1 - Math.cos(s * Math.PI / 2),
  easeOutSine: (s) => Math.sin(s * Math.PI / 2),
  easeInOutSine: (s) => -(Math.cos(Math.PI * s) - 1) / 2,
  // Exponential
  easeInExpo: (s) => s === 0 ? 0 : Math.pow(2, 10 * (s - 1)),
  easeOutExpo: (s) => s === 1 ? 1 : 1 - Math.pow(2, -10 * s),
  easeInOutExpo: (s) => s === 0 ? 0 : s === 1 ? 1 : s < 0.5 ? Math.pow(2, 20 * s - 10) / 2 : (2 - Math.pow(2, -20 * s + 10)) / 2,
  // Circular
  easeInCirc: (s) => 1 - Math.sqrt(1 - s * s),
  easeOutCirc: (s) => Math.sqrt(1 - --s * s),
  easeInOutCirc: (s) => s < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * s, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * s + 2, 2)) + 1) / 2,
  // Back (overshoots)
  easeInBack: (s) => s * s * ((1.70158 + 1) * s - 1.70158),
  easeOutBack: (s) => --s * s * ((1.70158 + 1) * s + 1.70158) + 1,
  easeInOutBack: (s) => {
    const e = 2.5949095;
    return (s *= 2) < 1 ? 0.5 * (s * s * ((e + 1) * s - e)) : 0.5 * ((s -= 2) * s * ((e + 1) * s + e) + 2);
  },
  // Elastic (bounces like a spring)
  easeInElastic: (s) => {
    if (s === 0)
      return 0;
    if (s === 1)
      return 1;
    const e = 0.3, t = e / (2 * Math.PI) * Math.asin(1);
    return -(Math.pow(2, 10 * (s -= 1)) * Math.sin((s - t) * (2 * Math.PI) / e));
  },
  easeOutElastic: (s) => {
    if (s === 0)
      return 0;
    if (s === 1)
      return 1;
    const e = 0.3, t = e / (2 * Math.PI) * Math.asin(1);
    return Math.pow(2, -10 * s) * Math.sin((s - t) * (2 * Math.PI) / e) + 1;
  },
  easeInOutElastic: (s) => {
    if (s === 0)
      return 0;
    if ((s *= 2) === 2)
      return 1;
    const e = 0.3 * 1.5, t = e / (2 * Math.PI) * Math.asin(1);
    return s < 1 ? -0.5 * (Math.pow(2, 10 * (s -= 1)) * Math.sin((s - t) * (2 * Math.PI) / e)) : Math.pow(2, -10 * (s -= 1)) * Math.sin((s - t) * (2 * Math.PI) / e) * 0.5 + 1;
  },
  // Bounce (decays bounces at the end)
  // Note: easeInBounce and easeInOutBounce depend on easeOutBounce
  easeOutBounce: (s) => s < 1 / 2.75 ? 7.5625 * s * s : s < 2 / 2.75 ? 7.5625 * (s -= 1.5 / 2.75) * s + 0.75 : s < 2.5 / 2.75 ? 7.5625 * (s -= 2.25 / 2.75) * s + 0.9375 : 7.5625 * (s -= 2.625 / 2.75) * s + 0.984375,
  easeInBounce: (s) => 1 - D.easeOutBounce(1 - s),
  easeInOutBounce: (s) => s < 0.5 ? (1 - D.easeOutBounce(1 - 2 * s)) / 2 : (1 + D.easeOutBounce(2 * s - 1)) / 2
};
function le(s) {
  return !!document.querySelector(`script[src*="${s}"]`);
}
function W() {
  const e = Array.from(document.getElementsByTagName("script")).find(
    (t) => t.src && (t.src.includes("mation.js") || t.src.includes("mation.min.js"))
  );
  if (e) {
    const t = new URL(e.src), i = t.pathname.split("/");
    return i.pop(), i.length === 0 ? "/" : `${t.origin}${i.join("/")}`;
  }
  return window.location.origin;
}
async function he(s) {
  return le(s) ? Promise.resolve() : new Promise((e, t) => {
    const i = document.createElement("script");
    i.src = s, i.async = !0, i.onload = () => e(), i.onerror = (o) => t(new Error(`Failed to load script: ${s}: ${o}`)), document.head.appendChild(i);
  });
}
async function ce(s = {}) {
  const e = s.basePath || W();
  try {
    if (window.ffmpegInitialized && window.ffmpegInstance)
      return;
    const t = document.createElement("script");
    t.src = `${e}/libs/ffmpeg/ffmpeg.min.js`, await new Promise((i, o) => {
      t.onload = async () => {
        try {
          const { FFmpeg: r } = window.FFmpegWASM, n = new r();
          await n.load({
            coreURL: `${e}/libs/ffmpeg/ffmpeg-core.js`,
            wasmURL: `${e}/libs/ffmpeg/ffmpeg-core.wasm`
          }), window.ffmpegInstance = n, window.ffmpegInitialized = !0, console.log("FFmpeg loaded successfully"), i();
        } catch (r) {
          o(r);
        }
      }, t.onerror = () => o(new Error("Failed to load FFmpeg script")), document.head.appendChild(t);
    });
  } catch (t) {
    throw console.error("Failed to load FFmpeg:", t), t;
  }
}
async function ue(s = {}) {
  const e = s.basePath || W();
  try {
    await he(`${e}/libs/jszip/jszip.min.js`), console.log("JSZip loaded successfully");
  } catch (t) {
    throw console.error("Failed to load JSZip:", t), t;
  }
}
async function de(s = {}) {
  try {
    await Promise.all([
      ce(s),
      ue(s)
    ]), console.log("All rendering libraries loaded successfully");
  } catch (e) {
    throw console.error("Failed to load rendering libraries:", e), e;
  }
}
const Y = 3005;
function me() {
  const s = ["mp4", "zip"];
  return (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") && s.push("node_mp4"), s;
}
async function G(s, e = {}) {
  await de(e.libraryConfig);
  const {
    framerate: t = 60,
    codec: i = "libx264",
    outputFile: o = "out.mp4",
    onProgress: r,
    outputFormat: n = "mp4"
  } = e, l = s.getDuration(), h = [], u = 1 / t;
  for (let b = 0; b <= l + u; b += u)
    h.push(b);
  const E = s.playing();
  s.pause(), s.seekToTime(0);
  const y = 1 / h.length, m = [], T = [];
  for (let b = 0; b < h.length; b++) {
    s.renderAtTime(h[b]);
    const p = await new Promise(
      (g) => s.canvas.toBlob((w) => {
        g(w);
      })
    ), d = `frame_${b.toString().padStart(6, "0")}.png`;
    T.push(d), n === "mp4" ? window.ffmpegInstance.writeFile(d, new Uint8Array(await p.arrayBuffer())) : m.push(p), r && r((n === "mp4" ? 0.3 : 0.9) * (b * y));
  }
  if (r && r(n === "mp4" ? 0.3 : 0.9), n === "mp4") {
    const b = window.ffmpegInstance;
    b.on("progress", ({ progress: v }) => {
      if (r) {
        const F = 0.3 + v * 0.7;
        r(F);
      }
    }), b.on("log", (v) => {
      console.log(`ffmpeg log: ${JSON.stringify(v)}`);
    }), await b.exec([
      "-framerate",
      String(t),
      "-pattern_type",
      "glob",
      "-i",
      "*.png",
      "-c:v",
      i,
      "-preset",
      "medium",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "18",
      o
    ]), r && r(0.9);
    const p = await b.readFile(o), d = new Blob([p.buffer], { type: "video/mp4" }), g = URL.createObjectURL(d), w = document.createElement("a");
    w.href = g, w.download = o, document.body.appendChild(w), w.click(), document.body.removeChild(w), URL.revokeObjectURL(g);
  } else if (n === "node_mp4") {
    const b = `ws://${window.location.hostname}:${Y}`;
    let p;
    try {
      p = new WebSocket(b), p.onopen = function() {
        r && r(0.1), p.send(JSON.stringify({
          type: "init",
          metadata: {
            framerate: t,
            codec: i,
            totalFrames: m.length
          }
        }));
      }, p.onmessage = async function(d) {
        const g = JSON.parse(d.data);
        switch (g.type) {
          case "init":
            r && r(0.15), await x(p, m);
            break;
          case "frame_received":
            if (r) {
              const F = 0.15 + (g.index + 1) / m.length * 0.7;
              r(F);
            }
            g.index === m.length - 1 && p.send(JSON.stringify({
              type: "render",
              framerate: t,
              codec: i
            }));
            break;
          case "render_started":
            r && r(0.85);
            break;
          case "progress":
            if (r) {
              const F = 0.85 + g.frame / g.totalFrames * 0.13;
              r(Math.min(F, 0.98));
            }
            break;
          case "completed":
            r && r(0.98);
            const w = `http://${window.location.hostname}:${Y}${g.downloadUrl}`, v = document.createElement("a");
            v.href = w, v.download = o, document.body.appendChild(v), v.click(), document.body.removeChild(v), r && r(1), p.close();
            break;
          case "error":
            throw console.error("Server error:", g.message), new Error(`Server error: ${g.message}`);
        }
      }, p.onerror = function(d) {
        throw console.error("WebSocket error:", d), new Error("WebSocket connection error");
      }, await new Promise((d, g) => {
        p.onclose = d, p.onerror = g;
      });
    } catch (d) {
      throw console.error("Error in node_mp4 rendering:", d), p && p.readyState === WebSocket.OPEN && p.close(), d;
    }
  } else {
    const b = window.JSZip;
    if (!b)
      throw new Error("JSZip library is not loaded. Please include JSZip in your project.");
    const p = new b();
    for (let v = 0; v < m.length; v++)
      p.file(T[v], m[v]);
    const d = await p.generateAsync({ type: "blob" }), g = URL.createObjectURL(d), w = document.createElement("a");
    w.href = g, w.download = o.replace(/\.\w+$/, "") + ".zip", document.body.appendChild(w), w.click(), document.body.removeChild(w), URL.revokeObjectURL(g);
  }
  async function x(b, p) {
    for (let d = 0; d < p.length; d++) {
      for (; b.bufferedAmount > 1024 * 1024; )
        await new Promise((w) => setTimeout(w, 100));
      const g = await p[d].arrayBuffer();
      b.send(g), d % 10 === 0 && await new Promise((w) => setTimeout(w, 10));
    }
  }
  E && s.play(), r && r(1);
}
const ge = `
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

.time-display {
  color: white;
  font-size: 12px;
  margin-bottom: 5px;
  font-family: monospace;
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
function fe() {
  const s = document.createElement("style");
  s.id = "mation-styles", s.textContent = ge, document.head.appendChild(s);
}
function pe() {
  const s = document.getElementById("mation-styles");
  s && s.remove();
}
class we {
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
    a(this, "isPlaying", !0);
    a(this, "isDragging", !1);
    a(this, "wasPlayingBeforeDrag", !1);
    a(this, "isRendering", !1);
    a(this, "options");
    a(this, "updateScrubber", () => {
      if (!this.isDragging && this.scrubber && this.scene) {
        const e = this.scene.getCurrentTime(), t = this.scene.getDuration();
        if (t > 0) {
          const i = Math.min(Math.floor(e / t * 1e3), 1e3);
          this.scrubber.value = i.toString(), this.updateTimeDisplay(e, t), e >= t && this.isPlaying && (this.isPlaying = !1, this.playPauseButton && (this.playPauseButton.textContent = "▶️"));
        }
      }
      requestAnimationFrame(this.updateScrubber);
    });
    this.options = {
      enableRendering: !0,
      injectStyles: !0,
      ...e
    }, this.options.injectStyles && fe();
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
    if (this.setupControls(e), this.scene) {
      await this.scene.runSequence();
      const t = this.scene.getDuration(), i = this.scene.getCurrentTime();
      this.updateTimeDisplay(i, t), this.isPlaying = this.scene.playing(), this.playPauseButton && (this.playPauseButton.textContent = this.isPlaying ? "⏸️" : "▶️");
    }
    this.updateScrubber(), window.mation = this, window.render = async (t = "mp4") => {
      this.scene ? await G(this.scene, {
        outputFormat: t,
        libraryConfig: this.options.libraryConfig
      }) : console.error("No scene available to render");
    }, window.setTargetFPS = (t) => {
      this.scene && (this.scene.setTargetFPS(t), console.log(`Target FPS set to ${t}`));
    };
  }
  /**
   * Clean up and destroy the Mation instance
   * Call this when you're done with the Mation instance to clean up resources
   */
  destroy() {
    this.scene && this.scene.pause(), this.options.injectStyles && pe(), window.mation === this && (delete window.mation, delete window.render, delete window.setTargetFPS);
  }
  setupControls(e) {
    const t = document.createElement("div");
    t.className = "animation-controls", e.appendChild(t), this.playPauseButton = document.createElement("button"), this.playPauseButton.className = "play-pause-button", this.playPauseButton.textContent = "⏸️", t.appendChild(this.playPauseButton);
    const i = document.createElement("button");
    i.className = "reset-zoom-button", i.textContent = "🔍", i.title = "Reset Zoom", e.appendChild(i);
    const o = document.createElement("div");
    if (o.className = "scrubber-container", t.appendChild(o), this.timeDisplay = document.createElement("div"), this.timeDisplay.className = "time-display", this.timeDisplay.textContent = "0.00 / 0.00", o.appendChild(this.timeDisplay), this.scrubber = document.createElement("input"), this.scrubber.type = "range", this.scrubber.min = "0", this.scrubber.max = "1000", this.scrubber.value = "0", this.scrubber.className = "scrubber", o.appendChild(this.scrubber), this.options.enableRendering) {
      this.renderDropdown = document.createElement("div"), this.renderDropdown.className = "render-dropdown", e.appendChild(this.renderDropdown);
      const r = document.createElement("div");
      r.className = "button-container", this.renderDropdown.appendChild(r), this.renderButton = document.createElement("button"), this.renderButton.className = "render-button", this.renderButton.textContent = "Render MP4", r.appendChild(this.renderButton), this.dropdownToggle = document.createElement("button"), this.dropdownToggle.className = "dropdown-toggle", this.dropdownToggle.innerHTML = "▼", r.appendChild(this.dropdownToggle), this.renderOptions = document.createElement("div"), this.renderOptions.className = "render-options", this.renderDropdown.appendChild(this.renderOptions);
      const n = me(), l = document.createElement("div");
      l.className = "render-option selected", l.textContent = "MP4 Video", l.dataset.format = "mp4", this.renderOptions.appendChild(l);
      const h = document.createElement("div");
      if (h.className = "render-option", h.textContent = "PNG Sequence (ZIP)", h.dataset.format = "zip", this.renderOptions.appendChild(h), n.includes("node_mp4")) {
        const u = document.createElement("div");
        u.className = "render-option", u.textContent = "Server MP4 (faster)", u.dataset.format = "node_mp4", this.renderOptions.appendChild(u);
      }
      this.progressContainer = document.createElement("div"), this.progressContainer.className = "progress-container", e.appendChild(this.progressContainer), this.progressBar = document.createElement("div"), this.progressBar.className = "progress-bar", this.progressContainer.appendChild(this.progressBar);
    }
    this.setupEventListeners();
  }
  setupEventListeners() {
    var E, y, m, T, x, b, p, d, g, w, v, F, B, O, I, M, U, k, N, X, z;
    (E = this.playPauseButton) == null || E.addEventListener("click", () => {
      this.scene && (this.isPlaying ? (this.scene.pause(), this.playPauseButton && (this.playPauseButton.textContent = "▶️")) : (this.scene.getCurrentTime() >= this.scene.getDuration() && this.scene.seekToTime(0), this.scene.play(), this.playPauseButton && (this.playPauseButton.textContent = "⏸️")), this.isPlaying = !this.isPlaying);
    });
    const e = document.querySelector(".reset-zoom-button");
    e == null || e.addEventListener("click", () => {
      if (!this.scene)
        return;
      const c = this.scene.canvas.width, f = this.scene.canvas.height;
      this.scene.setMousePosition(c / 2, f / 2), this.scene.setZoom(1), this.scene.setPan([0, 0]);
    }), (y = this.scrubber) == null || y.addEventListener("mousedown", () => {
      this.scene && (this.isDragging = !0, this.wasPlayingBeforeDrag = this.isPlaying, this.scene.pause(), this.scene.setForceDefaultLayerOnly(!0));
    }), (m = this.scrubber) == null || m.addEventListener("touchstart", () => {
      this.scene && (this.isDragging = !0, this.wasPlayingBeforeDrag = this.isPlaying, this.scene.pause(), this.scene.setForceDefaultLayerOnly(!0));
    }), document.addEventListener("mouseup", () => {
      this.scene && this.isDragging && (this.isDragging = !1, this.scene.setForceDefaultLayerOnly(!1), this.wasPlayingBeforeDrag && (this.scene.play(), this.isPlaying = !0, this.playPauseButton && (this.playPauseButton.textContent = "⏸️")));
    }), document.addEventListener("touchend", () => {
      this.scene && this.isDragging && (this.isDragging = !1, this.scene.setForceDefaultLayerOnly(!1), this.wasPlayingBeforeDrag && (this.scene.play(), this.isPlaying = !0, this.playPauseButton && (this.playPauseButton.textContent = "⏸️")));
    }), (T = this.scrubber) == null || T.addEventListener("input", () => {
      if (!this.scene || !this.scrubber)
        return;
      const c = parseInt(this.scrubber.value, 10), f = this.scene.getDuration(), P = c / 1e3 * f;
      this.scene.seekToTime(P), this.updateTimeDisplay(P, f);
    }), (b = (x = this.scene) == null ? void 0 : x.canvas) == null || b.addEventListener("mousemove", (c) => {
      if (!this.scene || !this.scene.canvas)
        return;
      const f = this.scene.canvas.getBoundingClientRect(), P = c.clientX - f.left, C = c.clientY - f.top;
      this.scene.setMousePosition(P, C);
    });
    let t = null;
    (d = (p = this.scene) == null ? void 0 : p.canvas) == null || d.addEventListener("wheel", (c) => {
      if (!this.scene)
        return;
      c.preventDefault();
      const f = this.scene.canvas.getBoundingClientRect(), P = c.clientX - f.left, C = c.clientY - f.top;
      this.scene.setMousePosition(P, C);
      const R = this.scene.zoom;
      let S;
      c.deltaY > 0 ? S = Math.max(0.05, R / 1.1) : S = Math.min(10, R * 1.1), this.scene.setZoom(S), this.scene.setForceDefaultLayerOnly(!0), t !== null && clearTimeout(t), t = window.setTimeout(() => {
        this.scene && this.scene.setForceDefaultLayerOnly(!1), t = null;
      }, 200);
    }, { passive: !1 });
    let i = !1, o = 0, r = 0;
    (w = (g = this.scene) == null ? void 0 : g.canvas) == null || w.addEventListener("mousedown", (c) => {
      this.scene && c.altKey && (i = !0, o = c.clientX, r = c.clientY);
    }), (F = (v = this.scene) == null ? void 0 : v.canvas) == null || F.addEventListener("mousemove", (c) => {
      if (!this.scene || !i)
        return;
      const f = c.clientX - o, P = c.clientY - r, [C, R] = this.scene.pan;
      this.scene.setPan([C + f, R + P]), o = c.clientX, r = c.clientY;
    }), (O = (B = this.scene) == null ? void 0 : B.canvas) == null || O.addEventListener("mouseup", () => {
      var c;
      i = !1, (c = this.scene) == null || c.setForceDefaultLayerOnly(!1);
    });
    let n = 0, l = 1, h = 0, u = 0;
    (M = (I = this.scene) == null ? void 0 : I.canvas) == null || M.addEventListener("touchstart", (c) => {
      if (this.scene && c.touches.length === 2) {
        const f = c.touches[0], P = c.touches[1];
        n = Math.hypot(
          P.clientX - f.clientX,
          P.clientY - f.clientY
        ), l = this.scene.zoom, h = (f.clientX + P.clientX) / 2, u = (f.clientY + P.clientY) / 2;
      }
    }), (k = (U = this.scene) == null ? void 0 : U.canvas) == null || k.addEventListener("touchmove", (c) => {
      if (this.scene && c.touches.length === 2) {
        c.preventDefault();
        const f = c.touches[0], P = c.touches[1], C = Math.hypot(
          P.clientX - f.clientX,
          P.clientY - f.clientY
        ), R = (f.clientX + P.clientX) / 2, S = (f.clientY + P.clientY) / 2, _ = this.scene.canvas.getBoundingClientRect(), q = R - _.left, j = S - _.top;
        this.scene.setMousePosition(q, j);
        const Z = C / n;
        this.scene.setZoom(l * Z);
        const Q = R - h, V = S - u, [H, J] = this.scene.pan;
        this.scene.setPan([H + Q, J + V]), h = R, u = S;
      }
    }, { passive: !1 }), this.options.enableRendering && ((N = this.dropdownToggle) == null || N.addEventListener("click", () => {
      this.isRendering || this.renderOptions && this.renderOptions.classList.toggle("visible");
    }), (X = this.renderOptions) == null || X.addEventListener("click", (c) => {
      var P, C;
      const f = c.target;
      if (f.classList.contains("render-option")) {
        const R = f.dataset.format;
        this.selectedFormat = R;
        const S = (P = this.renderOptions) == null ? void 0 : P.querySelectorAll(".render-option");
        S == null || S.forEach((_) => _.classList.remove("selected")), f.classList.add("selected"), this.renderButton && (R === "mp4" ? this.renderButton.textContent = "Render MP4" : R === "zip" ? this.renderButton.textContent = "Render PNGs" : R === "node_mp4" && (this.renderButton.textContent = "Render Server MP4")), (C = this.renderOptions) == null || C.classList.remove("visible");
      }
    }), document.addEventListener("click", (c) => {
      var f;
      (f = this.renderOptions) != null && f.classList.contains("visible") && this.dropdownToggle && !(c.target === this.dropdownToggle || this.dropdownToggle.contains(c.target)) && !(c.target === this.renderOptions || this.renderOptions.contains(c.target)) && this.renderOptions.classList.remove("visible");
    }), (z = this.renderButton) == null || z.addEventListener("click", async () => {
      var c;
      if (!(!this.scene || this.isRendering || !this.renderButton || !this.progressContainer || !this.progressBar)) {
        (c = this.renderOptions) != null && c.classList.contains("visible") && this.renderOptions.classList.remove("visible"), this.isRendering = !0, this.renderButton.disabled = !0, this.renderButton.textContent = "Rendering...", this.progressContainer.classList.add("visible"), this.progressBar.style.width = "0%";
        try {
          await G(this.scene, {
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
  updateTimeDisplay(e, t) {
    this.timeDisplay && (this.timeDisplay.textContent = `${e.toFixed(2)}s / ${t.toFixed(2)}s`);
  }
}
export {
  D as Easing,
  ye as Layer,
  we as Mation,
  $ as Scene,
  ie as WebGLPipeline,
  ae as buildWebGlPipeline,
  we as default,
  me as getAvailableFormats,
  fe as injectStyles,
  ce as loadFFmpeg,
  ue as loadJSZip,
  de as loadRenderingLibraries,
  pe as removeStyles,
  G as renderToVideo
};
//# sourceMappingURL=mation.js.map
