// Shared WebGL2 goo engine. ONE context per document renders every canvas-goop instance.
//
// It reproduces the SVG filter pipeline on the GPU, then improves the edge:
//   1. scene : rasterize the body (rounded box) + blob circles as coverage into an R
//              texture, "over"-composited (same union the SVG layer paints), at a reduced
//              resolution (1/n of device px; the blur hides it).
//   2. blur  : separable Gaussian, sigma = --goop-blur (css px), two passes.
//   3. edge  : per instance, sample the blurred field at device resolution and threshold it
//              at --goop-threshold. The edge ramp is max(1/contrast, fwidth(field)), i.e. the
//              SVG feColorMatrix ramp when that is softer than a pixel, else ~1 device px of
//              analytic anti-aliasing (the SVG one aliases at high contrast).
//   4. blit  : drawImage each instance's rect into its own 2D <canvas> (which sits in the
//              host at z-index -1, exactly like the SVG layer).
//
// Many instances are packed into one atlas and drawn in 4 draw calls total per batch, so
// cost barely grows with instance count. Nothing here touches the DOM at import time.

/** One shape in FIELD pixels: a rounded box (circles are boxes with radius = half size). */
export interface GlShape {
  cx: number
  cy: number
  /** Unscaled half extents. */
  hx: number
  hy: number
  /** Corner radii tl, tr, br, bl (unscaled). */
  tl: number
  tr: number
  br: number
  bl: number
  sx: number
  sy: number
  opacity: number
  /** Horizontal shear applied after scale (x += shear * y), i.e. tan(skewX). 0 for blobs. */
  shear: number
}

/** One instance to render: its rect in the atlas (device px) and how to color it. */
export interface GlItem {
  /** Atlas position, device px, multiples of `n`. */
  x: number
  y: number
  /** Size in device px. */
  w: number
  h: number
  /** Premultiplied RGBA 0..1. */
  color: readonly [number, number, number, number]
  threshold: number
  contrast: number
}

export interface GlBatch {
  /** Field downscale (device px per field px), integer >= 1. */
  n: number
  /** Blur sigma in FIELD px. */
  sigma: number
  /** Used atlas extent, device px (includes the trailing gap). */
  width: number
  height: number
  items: GlItem[]
  /** Shapes for all items, already in field px atlas coordinates. */
  shapes: GlShape[]
}

const SCENE_VS = `#version 300 es
layout(location=0) in vec2 a_corner;
layout(location=1) in vec4 a_box;
layout(location=2) in vec4 a_radii;
layout(location=3) in vec4 a_scale; // sx, sy, opacity, shear
uniform vec2 u_view;
out vec2 v_p;
flat out vec4 v_box;
flat out vec4 v_radii;
flat out vec4 v_scale;
void main() {
  // Local shape -> scale -> shear (x += k*y) -> translate. The quad covers the sheared box.
  vec2 he = a_box.zw * a_scale.xy;
  vec2 ext = vec2(he.x + abs(a_scale.w) * he.y, he.y) + 1.5;
  vec2 pos = a_box.xy + (a_corner * 2.0 - 1.0) * ext;
  vec2 q = pos - a_box.xy;
  q.x -= a_scale.w * q.y;
  v_p = q / max(a_scale.xy, vec2(1e-4));
  v_box = a_box; v_radii = a_radii; v_scale = a_scale;
  gl_Position = vec4(pos / u_view * 2.0 - 1.0, 0.0, 1.0);
}`

const SCENE_FS = `#version 300 es
precision highp float;
in vec2 v_p;
flat in vec4 v_box;
flat in vec4 v_radii;
flat in vec4 v_scale;
out vec4 o;
void main() {
  vec2 p = v_p;
  // y grows down: p.y > 0 is the bottom half.
  float r = p.x > 0.0 ? (p.y > 0.0 ? v_radii.z : v_radii.y) : (p.y > 0.0 ? v_radii.w : v_radii.x);
  vec2 q = abs(p) - v_box.zw + r;
  float d = (min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r) * min(v_scale.x, v_scale.y) / sqrt(1.0 + v_scale.w * v_scale.w);
  o = vec4(clamp(0.5 - d, 0.0, 1.0) * v_scale.z, 0.0, 0.0, 0.0);
}`

const FULL_VS = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

export const MAX_TAPS = 32

const BLUR_FS = `#version 300 es
precision highp float;
uniform sampler2D u_src;
uniform vec2 u_dir;
uniform vec2 u_tex;
uniform vec2 u_max;
uniform float u_w0;
uniform vec2 u_tap[${MAX_TAPS}];
uniform int u_count;
out vec4 o;
float at(vec2 q) { return texture(u_src, clamp(q, vec2(0.5), u_max - 0.5) / u_tex).r; }
void main() {
  vec2 p = gl_FragCoord.xy;
  float s = texture(u_src, p / u_tex).r * u_w0;
  for (int i = 0; i < ${MAX_TAPS}; i++) {
    if (i >= u_count) break;
    vec2 d = u_dir * u_tap[i].x;
    s += (at(p + d) + at(p - d)) * u_tap[i].y;
  }
  o = vec4(s, 0.0, 0.0, 0.0);
}`

const EDGE_VS = `#version 300 es
layout(location=0) in vec2 a_corner;
layout(location=1) in vec4 a_rect;
layout(location=2) in vec4 a_color;
layout(location=3) in vec2 a_edge;
uniform vec2 u_canvas;
uniform float u_n;
out vec2 v_field;
flat out vec4 v_color;
flat out vec2 v_edge;
void main() {
  vec2 local = a_corner * a_rect.zw;
  vec2 pos = a_rect.xy + local;
  v_field = (a_rect.xy + local) / u_n;
  v_color = a_color; v_edge = a_edge;
  gl_Position = vec4(pos.x / u_canvas.x * 2.0 - 1.0, 1.0 - pos.y / u_canvas.y * 2.0, 0.0, 1.0);
}`

// Field sampling uses a 4-tap bicubic B-spline (built from bilinear fetches) so the
// upsampled field has a continuous gradient: no faceting on the contour.
const EDGE_FS = `#version 300 es
precision highp float;
uniform sampler2D u_field;
uniform vec2 u_tex;
in vec2 v_field;
flat in vec4 v_color;
flat in vec2 v_edge;
out vec4 o;
float bicubic(vec2 p) {
  vec2 t = p - 0.5;
  vec2 i = floor(t);
  vec2 f = t - i;
  vec2 f2 = f * f, f3 = f2 * f;
  vec2 w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0;
  vec2 w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0;
  vec2 w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0;
  vec2 w3 = f3 / 6.0;
  vec2 g0 = w0 + w1, g1 = w2 + w3;
  vec2 h0 = i - 0.5 + w1 / g0;
  vec2 h1 = i + 1.5 + w3 / g1;
  float a = texture(u_field, vec2(h0.x, h0.y) / u_tex).r;
  float b = texture(u_field, vec2(h1.x, h0.y) / u_tex).r;
  float c = texture(u_field, vec2(h0.x, h1.y) / u_tex).r;
  float d = texture(u_field, vec2(h1.x, h1.y) / u_tex).r;
  return g0.y * (g0.x * a + g1.x * b) + g1.y * (g0.x * c + g1.x * d);
}
void main() {
  float f = bicubic(v_field);
  float c = v_edge.y;
  float t0 = v_edge.x + 0.5 / c;
  float w = max(1.0 / c, fwidth(f));
  float a = clamp((f - t0) / w + 0.5, 0.0, 1.0);
  o = v_color * a;
}`

interface Target {
  tex: WebGLTexture
  fbo: WebGLFramebuffer
}

function compile(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const sh = (type: number, src: string): WebGLShader => {
    const s = gl.createShader(type)
    if (!s) throw new Error('createShader failed')
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
      throw new Error(`[goopui] shader: ${gl.getShaderInfoLog(s) ?? ''}`)
    }
    return s
  }
  const p = gl.createProgram()
  if (!p) throw new Error('createProgram failed')
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs))
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs))
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) {
    throw new Error(`[goopui] link: ${gl.getProgramInfoLog(p) ?? ''}`)
  }
  return p
}

/** Gaussian taps for the linear-sampling trick: center weight + (offset, weight) pairs. */
export function gaussianTaps(sigma: number): { w0: number; taps: Float32Array; count: number } {
  const radius = Math.min(MAX_TAPS * 2, Math.ceil(sigma * 3))
  const w: number[] = []
  let sum = 0
  for (let i = 0; i <= radius; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma))
    w.push(v)
    sum += i === 0 ? v : 2 * v
  }
  const taps = new Float32Array(MAX_TAPS * 2)
  let count = 0
  for (let i = 1; i <= radius && count < MAX_TAPS; i += 2) {
    const a = w[i]! / sum
    const b = (w[i + 1] ?? 0) / sum
    const ww = a + b
    taps[count * 2] = (i * a + (i + 1) * b) / ww
    taps[count * 2 + 1] = ww
    count++
  }
  return { w0: w[0]! / sum, taps, count }
}

const roundUp = (n: number, step: number): number => Math.ceil(n / step) * step

export class GlGooEngine {
  readonly canvas: HTMLCanvasElement
  readonly gl: WebGL2RenderingContext
  /** Largest atlas side (device px) this context can do. */
  readonly maxSize: number
  private scene!: WebGLProgram
  private blur!: WebGLProgram
  private edge!: WebGLProgram
  private sceneVao!: WebGLVertexArrayObject
  private edgeVao!: WebGLVertexArrayObject
  private emptyVao!: WebGLVertexArrayObject
  private sceneBuf!: WebGLBuffer
  private edgeBuf!: WebGLBuffer
  private targets: Target[] = []
  private texW = 0
  private texH = 0
  private halfFloat = false
  private sceneData = new Float32Array(12 * 64)
  private edgeData = new Float32Array(10 * 16)
  private u: Record<string, WebGLUniformLocation | null> = {}
  private tapCache = new Map<number, ReturnType<typeof gaussianTaps>>()

  constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
    this.canvas = canvas
    this.gl = gl
    const dims = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array | number[] | null
    this.maxSize = Math.max(
      256,
      Math.min(
        4096,
        Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 4096,
        Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)) || 4096,
        Number(dims?.[0]) || 4096,
        Number(dims?.[1]) || 4096,
      ),
    )
    this.init()
  }

  /** (Re)build every GL resource. Called at construction and after a context restore. */
  init(): void {
    const gl = this.gl
    this.halfFloat = !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float')
    this.scene = compile(gl, SCENE_VS, SCENE_FS)
    this.blur = compile(gl, FULL_VS, BLUR_FS)
    this.edge = compile(gl, EDGE_VS, EDGE_FS)
    const loc = (p: WebGLProgram, prefix: string, names: string[]): void => {
      for (const n of names) this.u[`${prefix}.${n}`] = gl.getUniformLocation(p, n)
    }
    loc(this.scene, 's', ['u_view'])
    loc(this.blur, 'b', ['u_src', 'u_dir', 'u_tex', 'u_max', 'u_w0', 'u_tap', 'u_count'])
    loc(this.edge, 'e', ['u_canvas', 'u_n', 'u_field', 'u_tex'])

    const corners = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, corners)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW)

    const vao = (buf: WebGLBuffer, layout: number[]): WebGLVertexArrayObject => {
      const v = gl.createVertexArray()!
      gl.bindVertexArray(v)
      gl.bindBuffer(gl.ARRAY_BUFFER, corners)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      const stride = layout.reduce((a, b) => a + b, 0) * 4
      let off = 0
      layout.forEach((size, i) => {
        gl.enableVertexAttribArray(i + 1)
        gl.vertexAttribPointer(i + 1, size, gl.FLOAT, false, stride, off)
        gl.vertexAttribDivisor(i + 1, 1)
        off += size * 4
      })
      gl.bindVertexArray(null)
      return v
    }
    this.sceneBuf = gl.createBuffer()!
    this.edgeBuf = gl.createBuffer()!
    this.sceneVao = vao(this.sceneBuf, [4, 4, 4])
    this.edgeVao = vao(this.edgeBuf, [4, 4, 2])
    this.emptyVao = gl.createVertexArray()!
    this.targets = []
    this.texW = 0
    this.texH = 0
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.CULL_FACE)
  }

  private ensureTargets(w: number, h: number): void {
    if (w <= this.texW && h <= this.texH && this.targets.length) return
    const gl = this.gl
    for (const t of this.targets) {
      gl.deleteTexture(t.tex)
      gl.deleteFramebuffer(t.fbo)
    }
    this.texW = Math.max(this.texW, roundUp(w, 128))
    this.texH = Math.max(this.texH, roundUp(h, 128))
    this.targets = []
    for (let i = 0; i < 3; i++) {
      const tex = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, tex)
      if (this.halfFloat) gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, this.texW, this.texH, 0, gl.RED, gl.HALF_FLOAT, null)
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, this.texW, this.texH, 0, gl.RED, gl.UNSIGNED_BYTE, null)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      const fbo = gl.createFramebuffer()!
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
      this.targets.push({ tex, fbo })
    }
    if (this.halfFloat && gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE && !gl.isContextLost()) {
      // Half-float advertised but not renderable here: drop to 8-bit and retry.
      this.halfFloat = false
      this.texW = 0
      this.texH = 0
      this.ensureTargets(w, h)
      return
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  /** Render one atlas batch into the shared canvas. Caller then blits each item out. */
  render(batch: GlBatch): void {
    const gl = this.gl
    const { n } = batch
    // Grow-only canvas so repeated batches don't reallocate the drawing buffer.
    const cw = Math.max(this.canvas.width, roundUp(batch.width, 256))
    const ch = Math.max(this.canvas.height, roundUp(batch.height, 256))
    if (cw !== this.canvas.width) this.canvas.width = Math.min(this.maxSize, cw)
    if (ch !== this.canvas.height) this.canvas.height = Math.min(this.maxSize, ch)
    const fw = Math.ceil(batch.width / n)
    const fh = Math.ceil(batch.height / n)
    this.ensureTargets(fw, fh)
    const [sceneT, tmpT, fieldT] = this.targets as [Target, Target, Target]

    // 1. scene
    const shapes = batch.shapes
    if (this.sceneData.length < shapes.length * 12) this.sceneData = new Float32Array(roundUp(shapes.length * 12, 12 * 64))
    const sd = this.sceneData
    for (let i = 0; i < shapes.length; i++) {
      const s = shapes[i]!
      const o = i * 12
      sd[o] = s.cx
      sd[o + 1] = s.cy
      sd[o + 2] = s.hx
      sd[o + 3] = s.hy
      sd[o + 4] = s.tl
      sd[o + 5] = s.tr
      sd[o + 6] = s.br
      sd[o + 7] = s.bl
      sd[o + 8] = s.sx
      sd[o + 9] = s.sy
      sd[o + 10] = s.opacity
      sd[o + 11] = s.shear
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, sceneT.fbo)
    gl.viewport(0, 0, fw, fh)
    gl.enable(gl.SCISSOR_TEST)
    gl.scissor(0, 0, fw, fh)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    if (shapes.length) {
      gl.useProgram(this.scene)
      gl.uniform2f(this.u['s.u_view']!, fw, fh)
      gl.enable(gl.BLEND)
      // Coverage "over": c = src + dst * (1 - src), in the R channel.
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR)
      gl.bindVertexArray(this.sceneVao)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.sceneBuf)
      gl.bufferData(gl.ARRAY_BUFFER, sd.subarray(0, shapes.length * 12), gl.STREAM_DRAW)
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, shapes.length)
      gl.disable(gl.BLEND)
    }

    // 2. blur (skipped when there is effectively none: field = scene)
    let field = sceneT
    if (batch.sigma >= 0.3) {
      let taps = this.tapCache.get(batch.sigma)
      if (!taps) {
        taps = gaussianTaps(batch.sigma)
        if (this.tapCache.size > 16) this.tapCache.clear()
        this.tapCache.set(batch.sigma, taps)
      }
      gl.useProgram(this.blur)
      gl.bindVertexArray(this.emptyVao)
      gl.uniform1i(this.u['b.u_src']!, 0)
      gl.uniform2f(this.u['b.u_tex']!, this.texW, this.texH)
      gl.uniform2f(this.u['b.u_max']!, fw, fh)
      gl.uniform1f(this.u['b.u_w0']!, taps.w0)
      gl.uniform2fv(this.u['b.u_tap']!, taps.taps)
      gl.uniform1i(this.u['b.u_count']!, taps.count)
      gl.activeTexture(gl.TEXTURE0)
      const pass = (src: Target, dst: Target, dx: number, dy: number): void => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo)
        gl.bindTexture(gl.TEXTURE_2D, src.tex)
        gl.uniform2f(this.u['b.u_dir']!, dx, dy)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
      pass(sceneT, tmpT, 1, 0)
      pass(tmpT, fieldT, 0, 1)
      field = fieldT
    }

    // 3. edge, into the shared canvas (default framebuffer)
    const items = batch.items
    if (this.edgeData.length < items.length * 10) this.edgeData = new Float32Array(roundUp(items.length * 10, 160))
    const ed = this.edgeData
    for (let i = 0; i < items.length; i++) {
      const it = items[i]!
      const o = i * 10
      ed[o] = it.x
      ed[o + 1] = it.y
      ed[o + 2] = it.w
      ed[o + 3] = it.h
      ed[o + 4] = it.color[0]
      ed[o + 5] = it.color[1]
      ed[o + 6] = it.color[2]
      ed[o + 7] = it.color[3]
      ed[o + 8] = it.threshold
      ed[o + 9] = Math.max(1, it.contrast)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    const W = this.canvas.width
    const H = this.canvas.height
    gl.viewport(0, 0, W, H)
    gl.scissor(0, 0, W, H)
    gl.disable(gl.SCISSOR_TEST)
    gl.useProgram(this.edge)
    gl.uniform2f(this.u['e.u_canvas']!, W, H)
    gl.uniform1f(this.u['e.u_n']!, n)
    gl.uniform1i(this.u['e.u_field']!, 0)
    gl.uniform2f(this.u['e.u_tex']!, this.texW, this.texH)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, field.tex)
    gl.bindVertexArray(this.edgeVao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeBuf)
    gl.bufferData(gl.ARRAY_BUFFER, ed.subarray(0, items.length * 10), gl.STREAM_DRAW)
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, items.length)
    gl.bindVertexArray(null)
  }

  /** Free GPU memory now instead of waiting for GC. */
  dispose(): void {
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
    this.canvas.width = 1
    this.canvas.height = 1
  }
}
