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
  /** Oil finish, or null for solid. */
  oil: GlOil | null
}

/** Per-instance oil-film parameters (css px unless noted). */
export interface GlOil {
  intensity: number
  /** Band size multiplier. */
  scale: number
  /** Thickness offset, cycles. */
  shift: number
  /** Seconds; drives the slow drift (frozen in reduced motion). */
  time: number
  /** Accumulated flow offset of the noise field. */
  flowX: number
  flowY: number
  /** Stretch vector (direction * amount) from pointer velocity. */
  stretchX: number
  stretchY: number
  /** Light position in item-local css px (pointer, or a default top-left light). */
  lightX: number
  lightY: number
  /** Device px per css px. */
  k: number
  /** 1 when the pointer is over the goo (light follows it), else 0. */
  pointer: number
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

/** Floats per instance in the edge pass: rect4 color4 edge2 oilA4 oilB4 oilC4. */
const EDGE_STRIDE = 22

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
layout(location=4) in vec4 a_oilA;
layout(location=5) in vec4 a_oilB;
layout(location=6) in vec4 a_oilC;
uniform vec2 u_canvas;
uniform float u_n;
out vec2 v_field;
out vec2 v_local;
flat out vec4 v_color;
flat out vec2 v_edge;
flat out vec4 v_oilA;
flat out vec4 v_oilB;
flat out vec4 v_oilC;
void main() {
  vec2 local = a_corner * a_rect.zw;
  vec2 pos = a_rect.xy + local;
  v_field = (a_rect.xy + local) / u_n;
  v_local = local;
  v_color = a_color; v_edge = a_edge;
  v_oilA = a_oilA; v_oilB = a_oilB; v_oilC = a_oilC;
  gl_Position = vec4(pos.x / u_canvas.x * 2.0 - 1.0, 1.0 - pos.y / u_canvas.y * 2.0, 0.0, 1.0);
}`

// Field sampling uses a 4-tap bicubic B-spline (built from bilinear fetches) so the
// upsampled field has a continuous gradient: no faceting on the contour.
//
// Oil finish: the field is treated as a height map (a dome that rises from the goo edge),
// its gradient gives a surface normal. Film thickness = slow fbm noise (flowing and
// stretching with the pointer) + a term that thickens toward grazing angles + shift; it is
// mapped to color with a 3-wavelength thin-film interference approximation, weighted by
// Fresnel, blended over the base color, plus a sharp and a broad specular.
const EDGE_FS = `#version 300 es
precision highp float;
uniform sampler2D u_field;
uniform vec2 u_tex;
uniform float u_sigma;
in vec2 v_field;
in vec2 v_local;
flat in vec4 v_color;
flat in vec2 v_edge;
flat in vec4 v_oilA;
flat in vec4 v_oilB;
flat in vec4 v_oilC;
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
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + vec2(1.7, 9.2); a *= 0.5; }
  return s / 0.9375;
}
// Reflectance of a thin water-like film (n = 1.33) in air for thickness d (nm).
vec3 thinFilm(float d, float cosI) {
  float sinT2 = (1.0 - cosI * cosI) / (1.33 * 1.33);
  float cosT = sqrt(max(0.0, 1.0 - sinT2));
  float opd = 2.0 * 1.33 * d * cosT;
  vec3 lambda = vec3(640.0, 540.0, 460.0);
  // Half-wave phase flip at the top surface; average two orders for softer, richer bands.
  vec3 r1 = 0.5 - 0.5 * cos(6.2831853 * opd / lambda);
  vec3 r2 = 0.5 - 0.5 * cos(6.2831853 * opd / (lambda * 1.08));
  return mix(r1, r2, 0.35);
}
vec3 oil(float f, vec3 base) {
  float t = v_edge.x;
  float intensity = v_oilA.x, scale = v_oilA.y, shift = v_oilA.z, time = v_oilA.w;
  float k = v_oilC.z;
  // Normal from the field gradient (bilinear central differences, 1 field px).
  float fx = texture(u_field, (v_field + vec2(1.0, 0.0)) / u_tex).r - texture(u_field, (v_field - vec2(1.0, 0.0)) / u_tex).r;
  float fy = texture(u_field, (v_field + vec2(0.0, 1.0)) / u_tex).r - texture(u_field, (v_field - vec2(0.0, 1.0)) / u_tex).r;
  float h = clamp((f - t) / (1.0 - t), 0.0, 1.0);
  float dH = 0.5 / sqrt(max(h, 0.03)) / (1.0 - t);
  vec2 g = vec2(fx, fy) * 0.5 * dH * u_sigma * 1.4;
  vec3 N = normalize(vec3(-g, 1.0));
  float cosV = N.z;
  float slope = 1.0 - cosV;
  // Flowing, pointer-stretched noise in css px.
  vec2 pc = v_local / k + v_oilB.xy;
  vec2 sv = v_oilB.zw;
  float sl = length(sv);
  if (sl > 1e-3) { vec2 dir = sv / sl; pc -= dir * dot(pc, dir) * (sl / (1.0 + sl)); }
  vec2 q = pc / (120.0 * scale);
  // Domain-warped fbm: swirls, like a film being dragged across the surface.
  vec2 warp = vec2(fbm(q * 0.8 + vec2(time * 0.03, 1.3)), fbm(q * 0.8 + vec2(5.2, -time * 0.025)));
  float nz = smoothstep(0.22, 0.78, fbm(q + 1.6 * warp + vec2(time * 0.02, -time * 0.015)));
  // Thickness spans ~1.5 interference orders (the vivid magenta/gold/green/cyan range),
  // and thickens toward the rim so bands wrap the curvature.
  float d = 260.0 + 640.0 * (nz + shift) + 420.0 * slope;
  vec3 film = thinFilm(d, cosV);
  float m = (film.r + film.g + film.b) / 3.0;
  vec3 hue = film - m;
  float lum = dot(base, vec3(0.2126, 0.7152, 0.0722));
  // The film shows mostly where the surface turns away (Fresnel), faintly on flat tops.
  // Mostly at the rim (grazing angles); the flat middle keeps the base color.
  float amt = intensity * (0.08 + 0.92 * smoothstep(0.04, 0.55, slope));
  vec3 col = base + amt * (hue * mix(0.55, 0.45, lum) + (m - 0.5) * mix(0.08, 0.04, lum));
  // Key light from the top-left, swung toward the pointer when it is over the goo.
  vec3 Ld = normalize(vec3(-0.45, -0.8, 0.5));
  vec3 P = vec3(v_local / k, 0.0);
  vec3 Lp = normalize(vec3(v_oilC.xy - P.xy, 60.0));
  vec3 L = normalize(mix(Ld, Lp, 0.75 * v_oilC.w));
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float nh = max(dot(N, H), 0.0);
  float spec = pow(nh, 70.0) * 0.6 + pow(nh, 9.0) * 0.07;
  col += spec * (0.4 + 0.6 * intensity) * (vec3(1.0) + hue * 0.6);
  return clamp(col, 0.0, 1.0);
}
void main() {
  float f = bicubic(v_field);
  float c = v_edge.y;
  float t0 = v_edge.x + 0.5 / c;
  float w = max(1.0 / c, fwidth(f));
  float a = clamp((f - t0) / w + 0.5, 0.0, 1.0);
  if (v_oilA.x <= 0.0 || a <= 0.0) { o = v_color * a; return; }
  vec3 base = v_color.rgb / max(v_color.a, 1e-4);
  o = vec4(oil(f, base), 1.0) * (v_color.a * a);
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
  private edgeData = new Float32Array(EDGE_STRIDE * 16)
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
    loc(this.edge, 'e', ['u_canvas', 'u_n', 'u_field', 'u_tex', 'u_sigma'])

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
    this.edgeVao = vao(this.edgeBuf, [4, 4, 2, 4, 4, 4])
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
    if (this.edgeData.length < items.length * EDGE_STRIDE) this.edgeData = new Float32Array(roundUp(items.length * EDGE_STRIDE, EDGE_STRIDE * 16))
    const ed = this.edgeData
    for (let i = 0; i < items.length; i++) {
      const it = items[i]!
      const o = i * EDGE_STRIDE
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
      const oil = it.oil
      if (oil) {
        ed[o + 10] = oil.intensity
        ed[o + 11] = oil.scale
        ed[o + 12] = oil.shift
        ed[o + 13] = oil.time
        ed[o + 14] = oil.flowX
        ed[o + 15] = oil.flowY
        ed[o + 16] = oil.stretchX
        ed[o + 17] = oil.stretchY
        ed[o + 18] = oil.lightX
        ed[o + 19] = oil.lightY
        ed[o + 20] = oil.k
        ed[o + 21] = oil.pointer
      } else {
        ed.fill(0, o + 10, o + EDGE_STRIDE)
        ed[o + 20] = 1
      }
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
    gl.uniform1f(this.u['e.u_sigma']!, Math.max(1, batch.sigma))
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, field.tex)
    gl.bindVertexArray(this.edgeVao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeBuf)
    gl.bufferData(gl.ARRAY_BUFFER, ed.subarray(0, items.length * EDGE_STRIDE), gl.STREAM_DRAW)
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
