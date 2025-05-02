var K = Object.defineProperty;
var ee = (i, e, t) => e in i ? K(i, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : i[e] = t;
var o = (i, e, t) => (ee(i, typeof e != "symbol" ? e + "" : e, t), t);
const L = `#version 300 es
precision highp float;
precision highp int;
`, te = `in vec2 position;
out vec2 vUv;
void main() {
    vUv = 0.5 * (position + 1.0);
    gl_Position = vec4(position, 0.0, 1.0);
}`;
class ie {
  constructor(e, t, s) {
    o(this, "vertexShader");
    o(this, "fragmentShader");
    o(this, "program");
    o(this, "quad");
    o(this, "name");
    o(this, "w");
    o(this, "uniforms");
    o(this, "instancedAttributes");
    o(this, "numInstances");
    o(this, "isInstanced");
    const { fragmentShader: a, vertexShader: r, uniforms: n, name: l, instanceAttributes: h, numInstances: c } = s;
    this.vertexShader = r ?? te, this.fragmentShader = a, this.program = e.createProgram(
      `${L}${this.vertexShader}`,
      `${L}${this.fragmentShader}`
    ), this.uniforms = n, this.quad = t, this.name = l || "", e.programs.set(l || "", this.program), this.w = e, this.instancedAttributes = {}, this.numInstances = c || 1, this.isInstanced = !!h && Object.keys(h).length > 0;
  }
  setInstanceAttribute(e, t, s) {
    this.instancedAttributes[e] = this.w.createInstancedAttribute(t, s), this.isInstanced = !0;
  }
  updateFragmentShader(e) {
    this.fragmentShader = e, this.program = this.w.createProgram(
      this.vertexShader,
      `${L}${this.fragmentShader}`
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
class se {
  constructor(e, t = e.createFullscreenQuad()) {
    o(this, "w");
    o(this, "quad");
    o(this, "passes");
    this.w = e, this.quad = t, this.passes = {};
  }
  createInstancedAttribute(e, t) {
    return this.w.createInstancedAttribute(e, t);
  }
  add(e, t = {}, s = {}) {
    const a = s.dpr || window.devicePixelRatio || 1, r = s.scale ? a : 1, n = this.w, l = this.w.canvas, h = this.w.canvas.width, c = this.w.canvas.height;
    n.gl.viewport(0, 0, l.width, l.height);
    const y = {
      minFilter: n.gl.NEAREST,
      magFilter: n.gl.NEAREST,
      internalFormat: n.gl.RGBA16F,
      format: n.gl.RGBA,
      type: n.gl.HALF_FLOAT,
      ...t
    }, w = (s == null ? void 0 : s.renderTargetCount) ?? 2, m = [];
    for (let x = 0; x < w; x++)
      m.push(
        n.createRenderTarget(h * r, c * r, y)
      );
    const E = this.createPass(e);
    return {
      canvas: l,
      render: (x) => {
        E.render({ uniforms: x == null ? void 0 : x.uniforms, renderTarget: x == null ? void 0 : x.renderTarget });
      },
      renderTargets: m,
      renderer: n,
      scaling: a,
      uniforms: E.uniforms,
      gl: this.gl(),
      stage: E
    };
  }
  createPass(e) {
    const { name: t, instanceAttributes: s } = e, a = `pass-${Object.keys(this.passes).length}:-${t ?? ""}`, r = new ie(
      this.w,
      this.quad,
      {
        ...e,
        name: a
      }
    );
    if (s)
      for (const [n, { data: l, itemSize: h }] of Object.entries(s))
        r.setInstanceAttribute(n, l, h);
    return this.passes[a] = r, r;
  }
  gl() {
    return this.w.gl;
  }
}
class re {
  constructor(e, t, s, a) {
    o(this, "gl");
    o(this, "name");
    o(this, "texture");
    o(this, "framebuffer");
    this.gl = e, this.name = t, this.texture = s, this.framebuffer = a;
  }
  updateFilters({ minFilter: e, magFilter: t }) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, e), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, t), this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }
}
class ne {
  constructor(e, t) {
    o(this, "canvas");
    o(this, "gl");
    o(this, "programs");
    o(this, "framebuffers");
    o(this, "defaultRenderTargetProps");
    o(this, "renderTargets");
    // Track the active attributes to ensure proper cleanup
    o(this, "activeAttributes", /* @__PURE__ */ new Set());
    // Track the active instanced attributes to ensure proper cleanup
    o(this, "activeInstancedAttributes", /* @__PURE__ */ new Set());
    this.canvas = e;
    const s = (t == null ? void 0 : t.dpr) ?? (window.devicePixelRatio || 1), a = (t == null ? void 0 : t.canvasScale) ?? 1 / s, r = e.width, n = e.height;
    "style" in e && (e.style.width = `${r * a}px`, e.style.height = `${n * a}px`);
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
    for (let c = 0; c < h; c++)
      this.gl.disableVertexAttribArray(c), this.gl.vertexAttribDivisor(c, 0);
  }
  createProgram(e, t) {
    const s = this.createShader(this.gl.VERTEX_SHADER, e), a = this.createShader(this.gl.FRAGMENT_SHADER, t), r = this.gl.createProgram();
    if (!r)
      throw new Error("Failed to create WebGL program");
    if (this.gl.attachShader(r, s), this.gl.attachShader(r, a), this.gl.linkProgram(r), !this.gl.getProgramParameter(r, this.gl.LINK_STATUS))
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
    const a = this.gl.createTexture();
    if (!a)
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
    }, a;
  }
  createTextureFromCanvas(e) {
    const t = this.gl, s = t.createTexture();
    if (!s)
      throw new Error("Failed to create WebGL texture");
    if (!e.getContext("2d"))
      throw new Error("Failed to get 2D context");
    return t.bindTexture(t.TEXTURE_2D, s), t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !1), t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL, !0), t.texImage2D(t.TEXTURE_2D, 0, t.RGBA, t.RGBA, t.UNSIGNED_BYTE, e), t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL, !1), t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !1), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_WRAP_S, t.CLAMP_TO_EDGE), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_WRAP_T, t.CLAMP_TO_EDGE), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_MIN_FILTER, t.NEAREST), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_MAG_FILTER, t.NEAREST), t.bindTexture(t.TEXTURE_2D, null), s;
  }
  createRenderTarget(e, t, s = {}, a) {
    const {
      // generateMipmaps,
      minFilter: r,
      magFilter: n,
      internalFormat: l,
      format: h,
      type: c
    } = {
      ...this.defaultRenderTargetProps,
      ...s
    }, y = a ?? `rt-${Object.keys(this.renderTargets).length}`, w = this.gl.createFramebuffer();
    if (!w)
      throw new Error("Failed to create framebuffer");
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, w);
    const m = this.gl.createTexture();
    if (!m)
      throw new Error("Failed to create texture");
    this.gl.bindTexture(this.gl.TEXTURE_2D, m), this.gl.texImage2D(this.gl.TEXTURE_2D, 0, l, e, t, 0, h, c, null), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, r), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, n), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE), this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, m, 0);
    const E = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
    if (E !== this.gl.FRAMEBUFFER_COMPLETE)
      throw new Error("Framebuffer is not complete: " + E);
    return this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null), this.gl.bindTexture(this.gl.TEXTURE_2D, null), this.framebuffers.set(y, { framebuffer: w, texture: m, width: e, height: t }), this.renderTargets[y] = new re(
      this.gl,
      y,
      m,
      w
    ), this.renderTargets[y];
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
  setUniform(e, t, s, a, r, n) {
    const l = e.getUniformLocation(a, r);
    if (l === null)
      return;
    let h = null;
    for (let m = 0; m < s; m++) {
      const E = e.getActiveUniform(a, m);
      if (E && E.name === r) {
        h = E;
        break;
      }
    }
    if (!h) {
      console.warn(`Unable to find uniform info for "${r}"`);
      return;
    }
    const { type: c, size: y } = h;
    function w(m, E) {
      return m instanceof E ? m : new E(m);
    }
    switch (c) {
      case e.FLOAT:
        e.uniform1f(l, n);
        break;
      case e.INT:
      case e.BOOL:
        e.uniform1i(l, n);
        break;
      case e.FLOAT_VEC2:
        e.uniform2fv(l, w(n, Float32Array));
        break;
      case e.FLOAT_VEC3:
        e.uniform3fv(l, w(n, Float32Array));
        break;
      case e.FLOAT_VEC4:
        e.uniform4fv(l, w(n, Float32Array));
        break;
      case e.INT_VEC2:
      case e.BOOL_VEC2:
        e.uniform2iv(l, w(n, Int32Array));
        break;
      case e.INT_VEC3:
      case e.BOOL_VEC3:
        e.uniform3iv(l, w(n, Int32Array));
        break;
      case e.INT_VEC4:
      case e.BOOL_VEC4:
        e.uniform4iv(l, w(n, Int32Array));
        break;
      case e.FLOAT_MAT2:
        e.uniformMatrix2fv(l, !1, w(n, Float32Array));
        break;
      case e.FLOAT_MAT3:
        e.uniformMatrix3fv(l, !1, w(n, Float32Array));
        break;
      case e.FLOAT_MAT4:
        e.uniformMatrix4fv(l, !1, w(n, Float32Array));
        break;
      case e.SAMPLER_2D:
      case e.SAMPLER_CUBE:
        const m = t.length;
        this.gl.activeTexture(this.gl.TEXTURE0 + m), t.push(m), this.gl.bindTexture(this.gl.TEXTURE_2D, n), this.gl.uniform1i(l, m), n != null && this.gl.generateMipmap(this.gl.TEXTURE_2D);
        break;
      default:
        c === e.FLOAT && y > 1 ? e.uniform1fv(l, w(n, Float32Array)) : (c === e.INT || c === e.BOOL) && y > 1 ? e.uniform1iv(l, w(n, Int32Array)) : console.warn(`Unsupported uniform type: ${c}`);
        break;
    }
  }
  render(e, t = {}, s = {}) {
    const a = this.programs.get(e);
    if (!a)
      throw new Error(`Program "${e}" not found`);
    try {
      this.gl.useProgram(a);
      const r = [], n = this.gl.getProgramParameter(a, this.gl.ACTIVE_UNIFORMS);
      for (const [c, y] of Object.entries(t))
        this.setUniform(this.gl, r, n, a, c, y);
      const l = this.setupAttributes(a, s), h = s.numInstances || 1;
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
    for (let a = 0; a < s; a++)
      this.gl.disableVertexAttribArray(a), this.gl.vertexAttribDivisor(a, 0);
    this.activeAttributes.clear(), this.activeInstancedAttributes.clear();
    for (const [a, r] of Object.entries(t)) {
      if (a === "instanceAttributes" || a === "numInstances")
        continue;
      const n = this.gl.getAttribLocation(e, a);
      if (n === -1) {
        console.warn(`Attribute "${a}" not found in shader program`);
        continue;
      }
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, r.buffer), this.gl.enableVertexAttribArray(n), this.gl.vertexAttribPointer(n, r.size, this.gl.FLOAT, !1, 0, 0), this.gl.vertexAttribDivisor(n, 0), this.activeAttributes.add(n);
    }
    if (t.instanceAttributes)
      for (const [a, r] of Object.entries(t.instanceAttributes)) {
        const n = this.gl.getAttribLocation(e, a);
        if (n === -1) {
          console.warn(`Instanced attribute "${a}" not found in shader program`);
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
function ae(i) {
  const e = new ne(i);
  return new se(e);
}
class we {
  constructor(e, t, s, a = {}) {
    o(this, "name");
    o(this, "x");
    o(this, "y");
    o(this, "width");
    o(this, "height");
    o(this, "isSubview");
    o(this, "renderDuringPreviewAction");
    o(this, "extras");
    o(this, "pipeline");
    o(this, "ignorePanZoom");
    o(this, "render");
    this.name = e, this.pipeline = t, this.render = s, this.x = a.x, this.y = a.y, this.width = a.width, this.height = a.height, this.isSubview = a.isSubview, this.renderDuringPreviewAction = a.renderDuringPreviewAction, this.ignorePanZoom = a.ignorePanZoom, this.extras = a.extras;
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
}, _ = class _ {
  constructor({ canvas: e, width: t, height: s }) {
    o(this, "canvas");
    o(this, "ctx");
    o(this, "width");
    o(this, "height");
    o(this, "_zoom", 1);
    o(this, "_pan", [0, 0]);
    o(this, "mousePosition", [0, 0]);
    o(this, "animationId", null);
    o(this, "texturePipelineResult");
    o(this, "layers", []);
    o(this, "layerLookup", {});
    o(this, "layerInitialProperties", {});
    o(this, "layerCanvases", {});
    o(this, "layerElements", {});
    o(this, "defaultLayerElements", []);
    o(this, "defaultLayerCanvas");
    o(this, "onFrame");
    // WebGL texture cache
    o(this, "textureCache", {});
    // Animation timeline properties
    o(this, "animationSegments", []);
    o(this, "isPlaying", !0);
    o(this, "currentTime", 0);
    o(this, "totalDuration", 0);
    o(this, "lastRenderTime", 0);
    o(this, "performingPreviewAction", !1);
    o(this, "renderQueued", !1);
    o(this, "targetFPS", 60);
    o(this, "frameInterval", 1e3 / 60 / 1e3);
    // Main render loop that respects target FPS
    o(this, "renderLoop", () => {
      const e = performance.now(), t = e - this.lastRenderTime;
      if (t >= this.frameInterval || this.lastRenderTime === 0)
        if (this.lastRenderTime = e, this.isPlaying) {
          const s = t / 1e3, a = this.currentTime;
          this.currentTime = Math.min(this.currentTime + s, this.totalDuration), this.renderAtTime(this.currentTime), this.savePlayerState(), this.onFrame && this.onFrame(), this.currentTime >= this.totalDuration && (this.isPlaying = !1, a < this.totalDuration && this.renderAtTime(this.totalDuration), this.savePlayerState());
        } else
          this.renderQueued && (this.renderAtTime(this.currentTime), this.renderQueued = !1);
      this.isPlaying && (this.renderQueued = !0), this.isPlaying || this.renderQueued ? this.animationId = requestAnimationFrame(this.renderLoop) : this.animationId = null;
    });
    this.canvas = e, this.canvas.width = t, this.canvas.height = s, this.width = t, this.height = s;
    const { ctx: a, texturePipelineResult: r, defaultLayerCanvas: n } = this.initialize();
    this.ctx = a, this.texturePipelineResult = r, this.defaultLayerCanvas = n;
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
    const [t, s] = this.mousePosition, a = (t - this._pan[0]) / this._zoom, r = (s - this._pan[1]) / this._zoom;
    this._zoom = e;
    const n = t - a * this._zoom, l = s - r * this._zoom;
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
    const s = ae(this.canvas);
    return this.texturePipelineResult = s.add(oe), this.defaultLayerCanvas = new OffscreenCanvas(this.canvas.width, this.canvas.height), this.setupLayers(), this.restorePlayerState(), {
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
    const s = t.width ?? this.canvas.width, a = t.height ?? this.canvas.height;
    this.layerCanvases[t.name] = new OffscreenCanvas(s, a);
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
    const e = {
      currentTime: this.currentTime,
      isPlaying: this.isPlaying,
      totalDuration: this.totalDuration,
      zoom: this._zoom,
      pan: this._pan
    };
    try {
      localStorage.setItem(_.PLAYER_STATE_KEY, JSON.stringify(e));
    } catch (t) {
      console.warn("Failed to save player state:", t);
    }
  }
  restorePlayerState() {
    try {
      const e = localStorage.getItem(_.PLAYER_STATE_KEY);
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
      localStorage.removeItem(_.PLAYER_STATE_KEY);
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
    const e = this.totalDuration, t = this.currentTime, s = this.isPlaying, a = this.currentTime;
    if (this.currentTime = 0, this.totalDuration = 0, this.animationSegments = [], this.lastRenderTime = 0, await this.buildAnimationTimeline(), t > 0 || a > 0) {
      const r = Math.max(t, a);
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
    const s = this.animationSegments.filter((r) => r.startTime <= t);
    s.sort((r, n) => r.startTime - n.startTime);
    const a = /* @__PURE__ */ new Map();
    for (const r of s) {
      const n = t - r.startTime;
      let l;
      n >= r.duration ? l = 1 : (l = Math.max(0, Math.min(n / r.duration, 1)), l = r.easing(l));
      for (const h of r.elements)
        a.set(h, l);
    }
    this.renderFrame(a);
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
    const s = this.currentTime, a = t.delay || 0, r = s + a, n = t.duration;
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
        for (const c of h) {
          if (c.segmentStartTime !== void 0 && c.segmentStartTime > t)
            continue;
          const y = e.has(c) ? e.get(c) : 1;
          this.renderElement(c, s, y);
        }
      }
    }
    const a = this.getTextureForCanvas(this.defaultLayerCanvas);
    this.texturePipelineResult.stage.set({
      u_texture: a,
      u_progress: 1
      // Always use full blending
    }), this.texturePipelineResult.renderer.setRenderTarget(null);
    const r = this.texturePipelineResult.gl;
    r.disable(r.SCISSOR_TEST), this.texturePipelineResult.render();
    for (const n of this.layers)
      if (!this.performingPreviewAction || n.renderDuringPreviewAction) {
        const l = this.layerCanvases[n.name], h = l.getContext("2d");
        h.clearRect(0, 0, l.width, l.height), h.save();
        const c = this.zoom, y = this.pan, w = (n.x ?? 0) * c + y[0], m = (n.y ?? 0) * c + y[1], E = (n.width ?? l.width) * c, x = (n.height ?? l.height) * c;
        if (n.isSubview)
          h.translate(y[0], y[1]), h.scale(c, c);
        else {
          const g = E / this.canvas.width, T = x / this.canvas.height;
          h.translate(w, m), h.scale(g, T);
        }
        const b = this.layerElements[n.name];
        for (const g of b) {
          if (g.segmentStartTime !== void 0 && g.segmentStartTime > t)
            continue;
          const T = e.has(g) ? e.get(g) : 1;
          this.renderElement(g, h, T);
        }
        h.restore();
        const p = this.getTextureForCanvas(l), d = this.texturePipelineResult.gl;
        d.enable(d.BLEND), d.blendFunc(d.SRC_ALPHA, d.ONE_MINUS_SRC_ALPHA), d.enable(d.SCISSOR_TEST), n.ignorePanZoom ? d.scissor(
          n.x ?? 0,
          n.y ?? 0,
          n.width ?? l.width,
          n.height ?? l.height
        ) : d.scissor(
          w,
          this.canvas.height - m - x,
          // WebGL has origin at bottom left
          E,
          x
        ), n.render(p, 1, this.performingPreviewAction), d.disable(d.BLEND), d.disable(d.SCISSOR_TEST);
      }
    s.restore();
  }
};
// 16.67ms for 60fps
// State persistence key
o(_, "PLAYER_STATE_KEY", "mation_player_state");
let Y = _;
const I = {
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
  easeInBounce: (i) => 1 - I.easeOutBounce(1 - i),
  easeInOutBounce: (i) => i < 0.5 ? (1 - I.easeOutBounce(1 - 2 * i)) / 2 : (1 + I.easeOutBounce(2 * i - 1)) / 2
};
function le(i) {
  return !!document.querySelector(`script[src*="${i}"]`);
}
function j() {
  const e = Array.from(document.getElementsByTagName("script")).find(
    (t) => t.src && (t.src.includes("mation.js") || t.src.includes("mation.min.js"))
  );
  if (e) {
    const t = new URL(e.src), s = t.pathname.split("/");
    return s.pop(), s.length === 0 ? "/" : `${t.origin}${s.join("/")}`;
  }
  return window.location.origin;
}
async function he(i) {
  return le(i) ? Promise.resolve() : new Promise((e, t) => {
    const s = document.createElement("script");
    s.src = i, s.async = !0, s.onload = () => e(), s.onerror = (a) => t(new Error(`Failed to load script: ${i}: ${a}`)), document.head.appendChild(s);
  });
}
async function ce(i = {}) {
  const e = i.basePath || j();
  try {
    if (window.ffmpegInitialized && window.ffmpegInstance)
      return;
    const t = document.createElement("script");
    t.src = `${e}/libs/ffmpeg/ffmpeg.min.js`, await new Promise((s, a) => {
      t.onload = async () => {
        try {
          const { FFmpeg: r } = window.FFmpegWASM, n = new r();
          await n.load({
            coreURL: `${e}/libs/ffmpeg/ffmpeg-core.js`,
            wasmURL: `${e}/libs/ffmpeg/ffmpeg-core.wasm`
          }), window.ffmpegInstance = n, window.ffmpegInitialized = !0, console.log("FFmpeg loaded successfully"), s();
        } catch (r) {
          a(r);
        }
      }, t.onerror = () => a(new Error("Failed to load FFmpeg script")), document.head.appendChild(t);
    });
  } catch (t) {
    throw console.error("Failed to load FFmpeg:", t), t;
  }
}
async function ue(i = {}) {
  const e = i.basePath || j();
  try {
    await he(`${e}/libs/jszip/jszip.min.js`), console.log("JSZip loaded successfully");
  } catch (t) {
    throw console.error("Failed to load JSZip:", t), t;
  }
}
async function de(i = {}) {
  try {
    await Promise.all([
      ce(i),
      ue(i)
    ]), console.log("All rendering libraries loaded successfully");
  } catch (e) {
    throw console.error("Failed to load rendering libraries:", e), e;
  }
}
const $ = 3005;
function me() {
  const i = ["mp4", "zip"];
  return (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") && i.push("node_mp4"), i;
}
async function G(i, e = {}) {
  await de(e.libraryConfig);
  const {
    framerate: t = 60,
    codec: s = "libx264",
    outputFile: a = "out.mp4",
    onProgress: r,
    outputFormat: n = "mp4"
  } = e, l = i.getDuration(), h = [], c = 1 / t;
  for (let b = 0; b <= l + c; b += c)
    h.push(b);
  const y = i.playing();
  i.pause(), i.seekToTime(0);
  const w = 1 / h.length, m = [], E = [];
  for (let b = 0; b < h.length; b++) {
    i.renderAtTime(h[b]);
    const p = await new Promise(
      (g) => i.canvas.toBlob((T) => {
        g(T);
      })
    ), d = `frame_${b.toString().padStart(6, "0")}.png`;
    E.push(d), n === "mp4" ? window.ffmpegInstance.writeFile(d, new Uint8Array(await p.arrayBuffer())) : m.push(p), r && r((n === "mp4" ? 0.3 : 0.9) * (b * w));
  }
  if (r && r(n === "mp4" ? 0.3 : 0.9), n === "mp4") {
    const b = window.ffmpegInstance;
    b.on("progress", ({ progress: v }) => {
      if (r) {
        const C = 0.3 + v * 0.7;
        r(C);
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
      s,
      "-preset",
      "medium",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "18",
      a
    ]), r && r(0.9);
    const p = await b.readFile(a), d = new Blob([p.buffer], { type: "video/mp4" }), g = URL.createObjectURL(d), T = document.createElement("a");
    T.href = g, T.download = a, document.body.appendChild(T), T.click(), document.body.removeChild(T), URL.revokeObjectURL(g);
  } else if (n === "node_mp4") {
    const b = `ws://${window.location.hostname}:${$}`;
    let p;
    try {
      p = new WebSocket(b), p.onopen = function() {
        r && r(0.1), p.send(JSON.stringify({
          type: "init",
          metadata: {
            framerate: t,
            codec: s,
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
              const C = 0.15 + (g.index + 1) / m.length * 0.7;
              r(C);
            }
            g.index === m.length - 1 && p.send(JSON.stringify({
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
              const C = 0.85 + g.frame / g.totalFrames * 0.13;
              r(Math.min(C, 0.98));
            }
            break;
          case "completed":
            r && r(0.98);
            const T = `http://${window.location.hostname}:${$}${g.downloadUrl}`, v = document.createElement("a");
            v.href = T, v.download = a, document.body.appendChild(v), v.click(), document.body.removeChild(v), r && r(1), p.close();
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
      p.file(E[v], m[v]);
    const d = await p.generateAsync({ type: "blob" }), g = URL.createObjectURL(d), T = document.createElement("a");
    T.href = g, T.download = a.replace(/\.\w+$/, "") + ".zip", document.body.appendChild(T), T.click(), document.body.removeChild(T), URL.revokeObjectURL(g);
  }
  async function x(b, p) {
    for (let d = 0; d < p.length; d++) {
      for (; b.bufferedAmount > 1024 * 1024; )
        await new Promise((T) => setTimeout(T, 100));
      const g = await p[d].arrayBuffer();
      b.send(g), d % 10 === 0 && await new Promise((T) => setTimeout(T, 10));
    }
  }
  y && i.play(), r && r(1);
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
  const i = document.createElement("style");
  i.id = "mation-styles", i.textContent = ge, document.head.appendChild(i);
}
function pe() {
  const i = document.getElementById("mation-styles");
  i && i.remove();
}
class Te {
  constructor(e = {}) {
    o(this, "scene");
    o(this, "playPauseButton", null);
    o(this, "scrubber", null);
    o(this, "timeDisplay", null);
    o(this, "renderButton", null);
    o(this, "renderDropdown", null);
    o(this, "renderOptions", null);
    o(this, "dropdownToggle", null);
    o(this, "selectedFormat", "mp4");
    o(this, "progressContainer", null);
    o(this, "progressBar", null);
    o(this, "isPlaying", !0);
    o(this, "isDragging", !1);
    o(this, "wasPlayingBeforeDrag", !1);
    o(this, "isRendering", !1);
    o(this, "options");
    o(this, "updateScrubber", () => {
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
      const t = this.scene.getDuration(), s = this.scene.getCurrentTime();
      this.updateTimeDisplay(s, t), this.isPlaying = this.scene.playing(), this.playPauseButton && (this.playPauseButton.textContent = this.isPlaying ? "⏸️" : "▶️");
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
    const s = document.createElement("button");
    s.className = "reset-zoom-button", s.textContent = "🔍", s.title = "Reset Zoom", e.appendChild(s);
    const a = document.createElement("div");
    if (a.className = "scrubber-container", t.appendChild(a), this.timeDisplay = document.createElement("div"), this.timeDisplay.className = "time-display", this.timeDisplay.textContent = "0.00 / 0.00", a.appendChild(this.timeDisplay), this.scrubber = document.createElement("input"), this.scrubber.type = "range", this.scrubber.min = "0", this.scrubber.max = "1000", this.scrubber.value = "0", this.scrubber.className = "scrubber", a.appendChild(this.scrubber), this.options.enableRendering) {
      this.renderDropdown = document.createElement("div"), this.renderDropdown.className = "render-dropdown", e.appendChild(this.renderDropdown);
      const r = document.createElement("div");
      r.className = "button-container", this.renderDropdown.appendChild(r), this.renderButton = document.createElement("button"), this.renderButton.className = "render-button", this.renderButton.textContent = "Render MP4", r.appendChild(this.renderButton), this.dropdownToggle = document.createElement("button"), this.dropdownToggle.className = "dropdown-toggle", this.dropdownToggle.innerHTML = "▼", r.appendChild(this.dropdownToggle), this.renderOptions = document.createElement("div"), this.renderOptions.className = "render-options", this.renderDropdown.appendChild(this.renderOptions);
      const n = me(), l = document.createElement("div");
      l.className = "render-option selected", l.textContent = "MP4 Video", l.dataset.format = "mp4", this.renderOptions.appendChild(l);
      const h = document.createElement("div");
      if (h.className = "render-option", h.textContent = "PNG Sequence (ZIP)", h.dataset.format = "zip", this.renderOptions.appendChild(h), n.includes("node_mp4")) {
        const c = document.createElement("div");
        c.className = "render-option", c.textContent = "Server MP4 (faster)", c.dataset.format = "node_mp4", this.renderOptions.appendChild(c);
      }
      this.progressContainer = document.createElement("div"), this.progressContainer.className = "progress-container", e.appendChild(this.progressContainer), this.progressBar = document.createElement("div"), this.progressBar.className = "progress-bar", this.progressContainer.appendChild(this.progressBar);
    }
    this.setupEventListeners();
  }
  setupEventListeners() {
    var y, w, m, E, x, b, p, d, g, T, v, C, B, D, O, M, U, k, N, X, z;
    (y = this.playPauseButton) == null || y.addEventListener("click", () => {
      this.scene && (this.isPlaying ? (this.scene.pause(), this.playPauseButton && (this.playPauseButton.textContent = "▶️")) : (this.scene.getCurrentTime() >= this.scene.getDuration() && this.scene.seekToTime(0), this.scene.play(), this.playPauseButton && (this.playPauseButton.textContent = "⏸️")), this.isPlaying = !this.isPlaying);
    });
    const e = document.querySelector(".reset-zoom-button");
    e == null || e.addEventListener("click", () => {
      if (!this.scene)
        return;
      const u = this.scene.canvas.width, f = this.scene.canvas.height;
      this.scene.setMousePosition(u / 2, f / 2), this.scene.setZoom(1), this.scene.setPan([0, 0]), this.scene.setPerformingPreviewAction(!1);
    }), (w = this.scrubber) == null || w.addEventListener("mousedown", () => {
      this.scene && (this.isDragging = !0, this.wasPlayingBeforeDrag = this.isPlaying, this.scene.pause(), this.scene.setPerformingPreviewAction(!0));
    }), (m = this.scrubber) == null || m.addEventListener("touchstart", () => {
      this.scene && (this.isDragging = !0, this.wasPlayingBeforeDrag = this.isPlaying, this.scene.pause(), this.scene.setPerformingPreviewAction(!0));
    }), document.addEventListener("mouseup", () => {
      this.scene && this.isDragging && (this.isDragging = !1, this.scene.setPerformingPreviewAction(!1), this.wasPlayingBeforeDrag && (this.scene.play(), this.isPlaying = !0, this.playPauseButton && (this.playPauseButton.textContent = "⏸️")));
    }), document.addEventListener("touchend", () => {
      this.scene && this.isDragging && (this.isDragging = !1, this.scene.setPerformingPreviewAction(!1), this.wasPlayingBeforeDrag && (this.scene.play(), this.isPlaying = !0, this.playPauseButton && (this.playPauseButton.textContent = "⏸️")));
    }), (E = this.scrubber) == null || E.addEventListener("input", () => {
      if (!this.scene || !this.scrubber)
        return;
      const u = parseInt(this.scrubber.value, 10), f = this.scene.getDuration(), P = u / 1e3 * f;
      this.scene.seekToTime(P), this.updateTimeDisplay(P, f);
    }), (b = (x = this.scene) == null ? void 0 : x.canvas) == null || b.addEventListener("mousemove", (u) => {
      if (!this.scene || !this.scene.canvas)
        return;
      const f = this.scene.canvas.getBoundingClientRect(), P = u.clientX - f.left, S = u.clientY - f.top;
      this.scene.setMousePosition(P, S);
    });
    let t = null;
    (d = (p = this.scene) == null ? void 0 : p.canvas) == null || d.addEventListener("wheel", (u) => {
      if (!this.scene)
        return;
      u.preventDefault();
      const f = this.scene.canvas.getBoundingClientRect(), P = u.clientX - f.left, S = u.clientY - f.top;
      this.scene.setMousePosition(P, S);
      const A = this.scene.zoom;
      let R;
      u.deltaY > 0 ? R = Math.max(0.05, A / 1.1) : R = Math.min(10, A * 1.1), this.scene.setZoom(R), this.scene.setPerformingPreviewAction(!0), t !== null && clearTimeout(t), t = window.setTimeout(() => {
        this.scene && this.scene.setPerformingPreviewAction(!1), t = null;
      }, 200);
    }, { passive: !1 });
    let s = !1, a = 0, r = 0;
    (T = (g = this.scene) == null ? void 0 : g.canvas) == null || T.addEventListener("mousedown", (u) => {
      this.scene && u.altKey && (this.scene.setPerformingPreviewAction(!0), s = !0, a = u.clientX, r = u.clientY);
    }), (C = (v = this.scene) == null ? void 0 : v.canvas) == null || C.addEventListener("mousemove", (u) => {
      if (!this.scene || !s)
        return;
      const f = u.clientX - a, P = u.clientY - r, [S, A] = this.scene.pan;
      this.scene.setPan([S + f, A + P]), a = u.clientX, r = u.clientY;
    }), (D = (B = this.scene) == null ? void 0 : B.canvas) == null || D.addEventListener("mouseup", () => {
      var u;
      s = !1, (u = this.scene) == null || u.setPerformingPreviewAction(!1);
    });
    let n = 0, l = 1, h = 0, c = 0;
    (M = (O = this.scene) == null ? void 0 : O.canvas) == null || M.addEventListener("touchstart", (u) => {
      if (this.scene && u.touches.length === 2) {
        const f = u.touches[0], P = u.touches[1];
        n = Math.hypot(
          P.clientX - f.clientX,
          P.clientY - f.clientY
        ), l = this.scene.zoom, h = (f.clientX + P.clientX) / 2, c = (f.clientY + P.clientY) / 2;
      }
    }), (k = (U = this.scene) == null ? void 0 : U.canvas) == null || k.addEventListener("touchmove", (u) => {
      if (this.scene && u.touches.length === 2) {
        u.preventDefault();
        const f = u.touches[0], P = u.touches[1], S = Math.hypot(
          P.clientX - f.clientX,
          P.clientY - f.clientY
        ), A = (f.clientX + P.clientX) / 2, R = (f.clientY + P.clientY) / 2, F = this.scene.canvas.getBoundingClientRect(), q = A - F.left, V = R - F.top;
        this.scene.setMousePosition(q, V);
        const W = S / n;
        this.scene.setZoom(l * W);
        const Z = A - h, Q = R - c, [H, J] = this.scene.pan;
        this.scene.setPan([H + Z, J + Q]), h = A, c = R;
      }
    }, { passive: !1 }), this.options.enableRendering && ((N = this.dropdownToggle) == null || N.addEventListener("click", () => {
      this.isRendering || this.renderOptions && this.renderOptions.classList.toggle("visible");
    }), (X = this.renderOptions) == null || X.addEventListener("click", (u) => {
      var P, S;
      const f = u.target;
      if (f.classList.contains("render-option")) {
        const A = f.dataset.format;
        this.selectedFormat = A;
        const R = (P = this.renderOptions) == null ? void 0 : P.querySelectorAll(".render-option");
        R == null || R.forEach((F) => F.classList.remove("selected")), f.classList.add("selected"), this.renderButton && (A === "mp4" ? this.renderButton.textContent = "Render MP4" : A === "zip" ? this.renderButton.textContent = "Render PNGs" : A === "node_mp4" && (this.renderButton.textContent = "Render Server MP4")), (S = this.renderOptions) == null || S.classList.remove("visible");
      }
    }), document.addEventListener("click", (u) => {
      var f;
      (f = this.renderOptions) != null && f.classList.contains("visible") && this.dropdownToggle && !(u.target === this.dropdownToggle || this.dropdownToggle.contains(u.target)) && !(u.target === this.renderOptions || this.renderOptions.contains(u.target)) && this.renderOptions.classList.remove("visible");
    }), (z = this.renderButton) == null || z.addEventListener("click", async () => {
      var u;
      if (!(!this.scene || this.isRendering || !this.renderButton || !this.progressContainer || !this.progressBar)) {
        (u = this.renderOptions) != null && u.classList.contains("visible") && this.renderOptions.classList.remove("visible"), this.isRendering = !0, this.renderButton.disabled = !0, this.renderButton.textContent = "Rendering...", this.progressContainer.classList.add("visible"), this.progressBar.style.width = "0%";
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
  I as Easing,
  we as Layer,
  Te as Mation,
  Y as Scene,
  se as WebGLPipeline,
  ae as createPipeline,
  Te as default,
  me as getAvailableFormats,
  fe as injectStyles,
  ce as loadFFmpeg,
  ue as loadJSZip,
  de as loadRenderingLibraries,
  pe as removeStyles,
  G as renderToVideo
};
//# sourceMappingURL=mation.js.map
