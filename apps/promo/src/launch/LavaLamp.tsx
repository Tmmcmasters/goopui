// The www landing's lava lamp (apps/www/app/components/landing/LavaLamp.vue) as a frame-exact
// Remotion layer: the same WebGL metaball shader and the same desktop blob paths, drawn for
// the frame's time instead of on requestAnimationFrame. The pointer mound follows a scripted
// point (no smoothing state: the caller passes where the mound is and how strong).

import { useLayoutEffect, useRef } from 'react'

export type LavaBlob = { bx: number; by: number; ax: number; ay: number; fx: number; fy: number; px: number; py: number; r: number; fr: number }

/** The site's desktop layout: the lamp lives on the right, two pools along the bottom. */
export const LAVA_DESKTOP: LavaBlob[] = [
  { bx: 0.78, by: 0.34, ax: 0.1, ay: 0.16, fx: 0.11, fy: 0.083, px: 0.0, py: 1.2, r: 0.098, fr: 0.111 },
  { bx: 0.66, by: 0.62, ax: 0.12, ay: 0.14, fx: 0.077, fy: 0.12, px: 2.1, py: 0.4, r: 0.085, fr: 0.145 },
  { bx: 0.9, by: 0.72, ax: 0.08, ay: 0.18, fx: 0.093, fy: 0.07, px: 4.0, py: 2.6, r: 0.072, fr: 0.093 },
  { bx: 0.58, by: 0.24, ax: 0.09, ay: 0.12, fx: 0.13, fy: 0.1, px: 1.1, py: 3.3, r: 0.06, fr: 0.162 },
  { bx: 0.86, by: 0.2, ax: 0.07, ay: 0.08, fx: 0.071, fy: 0.13, px: 5.2, py: 0.9, r: 0.051, fr: 0.128 },
  { bx: 0.18, by: 1.02, ax: 0.14, ay: 0.06, fx: 0.065, fy: 0.09, px: 3.0, py: 4.4, r: 0.102, fr: 0.085 },
  { bx: 0.45, by: 0.92, ax: 0.1, ay: 0.08, fx: 0.105, fy: 0.08, px: 0.7, py: 5.1, r: 0.064, fr: 0.136 },
]

/** The open: the same lamp framed around a centred logo (pools left, right and below). */
export const LAVA_OPEN: LavaBlob[] = [
  { bx: 0.86, by: 0.3, ax: 0.07, ay: 0.14, fx: 0.11, fy: 0.083, px: 0.0, py: 1.2, r: 0.098, fr: 0.111 },
  { bx: 0.76, by: 0.74, ax: 0.1, ay: 0.1, fx: 0.077, fy: 0.12, px: 2.1, py: 0.4, r: 0.085, fr: 0.145 },
  { bx: 0.12, by: 0.68, ax: 0.08, ay: 0.14, fx: 0.093, fy: 0.07, px: 4.0, py: 2.6, r: 0.09, fr: 0.093 },
  { bx: 0.16, by: 0.18, ax: 0.08, ay: 0.1, fx: 0.13, fy: 0.1, px: 1.1, py: 3.3, r: 0.062, fr: 0.162 },
  { bx: 0.95, by: 0.06, ax: 0.05, ay: 0.06, fx: 0.071, fy: 0.13, px: 5.2, py: 0.9, r: 0.055, fr: 0.128 },
  { bx: 0.4, by: 1.04, ax: 0.14, ay: 0.05, fx: 0.065, fy: 0.09, px: 3.0, py: 4.4, r: 0.1, fr: 0.085 },
  { bx: 0.62, by: 0.98, ax: 0.1, ay: 0.06, fx: 0.105, fy: 0.08, px: 0.7, py: 5.1, r: 0.064, fr: 0.136 },
]

const MAX = 7
const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`
// Verbatim from LavaLamp.vue.
const FRAG = `precision highp float;
uniform vec3 uB[${MAX}];
uniform int uN;
uniform vec2 uRes;
uniform vec3 uP;
uniform float uW;
uniform float uK;
float field(vec2 q){
  float f=0.;
  for(int i=0;i<${MAX};i++){
    if(i>=uN)break;
    float S=1./uRes.y;
    vec2 d=(q-uB[i].xy)*S;
    float r=uB[i].z*S;
    float r2=r*r;
    f+=r2/(dot(d,d)+.3*r2);
  }
  return f;
}
float total(vec2 q){
  vec2 dp=(q-uP.xy)/uW;
  return field(q)+uP.z*exp(-dot(dp,dp));
}
float height(float f){return clamp(1.-1./max(f,.001),0.,1.);}
void main(){
  vec2 q=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  float f=total(q);
  float body=smoothstep(0.96,1.04,f);
  float hgt=height(f);
  float hx=height(total(q+vec2(2.,0.)))-hgt;
  float hy=height(total(q+vec2(0.,2.)))-hgt;
  vec3 n=normalize(vec3(-hx*.5,-hy*.5,uK));
  float lit=max(dot(n,normalize(vec3(-.45,-.6,.66))),0.);
  float spec=pow(lit,10.);
  vec3 rim=vec3(.02,.22,.09);
  vec3 mid=vec3(.1,.56,.25);
  vec3 sheen=vec3(.55,.92,.66);
  vec3 col=mix(rim,mid,smoothstep(0.,.6,hgt))*(.62+.5*lit)+sheen*spec*.26;
  float glow=smoothstep(.2,1.,f)*(1.-body)*.22;
  float a=body+glow;
  vec3 c=mix(vec3(.1,.55,.25),col,body);
  gl_FragColor=vec4(c*a,a);
}`

interface Gl {
  gl: WebGLRenderingContext
  uB: WebGLUniformLocation | null
  uN: WebGLUniformLocation | null
  uRes: WebGLUniformLocation | null
  uP: WebGLUniformLocation | null
  uW: WebGLUniformLocation | null
  uK: WebGLUniformLocation | null
}

function setup(el: HTMLCanvasElement): Gl | null {
  const gl = el.getContext('webgl', { antialias: false, premultipliedAlpha: true, alpha: true, preserveDrawingBuffer: true })
  if (!gl) return null
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`[lava] ${gl.getShaderInfoLog(s)}`)
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('[lava] link failed')
  gl.useProgram(prog)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const u = (n: string) => gl.getUniformLocation(prog, n)
  return { gl, uB: u('uB'), uN: u('uN'), uRes: u('uRes'), uP: u('uP'), uW: u('uW'), uK: u('uK') }
}

export interface LavaLampProps {
  /** Lamp time (s). The site starts at 24 and runs at 1x; the clip runs it faster. */
  time: number
  blobs?: LavaBlob[]
  /** Composition size (CSS px). */
  width: number
  height: number
  /** Pointer mound: position in composition px and strength 0..1. */
  pointer?: { x: number; y: number; s: number }
  /** Blend between two layouts: blobs (0) -> to (1), per blob. */
  to?: LavaBlob[]
  mix?: number
  /** Scale every blob's radius (a lamp that swells in from nothing). */
  grow?: number
  style?: React.CSSProperties
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u

export function LavaLamp({ time, blobs = LAVA_DESKTOP, to, mix = 0, width, height, pointer, grow = 1, style }: LavaLampProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<Gl | null>(null)
  // The render is at --scale device pixels; draw the canvas at that density.
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (!glRef.current) glRef.current = setup(el)
    const g = glRef.current
    if (!g) return
    const W = Math.round(width * dpr)
    const H = Math.round(height * dpr)
    if (el.width !== W || el.height !== H) {
      el.width = W
      el.height = H
    }
    const { gl } = g
    gl.viewport(0, 0, W, H)
    gl.uniform2f(g.uRes, W, H)
    const unit = Math.sqrt(width * height)
    const data = new Float32Array(MAX * 3)
    const n = blobs.length
    for (let i = 0; i < n; i++) {
      const a = blobs[i]!
      const b = to?.[i] ?? a
      const m = to ? mix : 0
      const bx = lerp(a.bx, b.bx, m)
      const by = lerp(a.by, b.by, m)
      const ax = lerp(a.ax, b.ax, m)
      const ay = lerp(a.ay, b.ay, m)
      const r = lerp(a.r, b.r, m)
      data[i * 3] = (bx + ax * Math.sin(time * a.fx + a.px)) * width * dpr
      data[i * 3 + 1] = (by + ay * Math.sin(time * a.fy + a.py)) * height * dpr
      data[i * 3 + 2] = r * 1.12 * unit * (1 + 0.14 * Math.sin(time * a.fr + a.px * 1.7)) * dpr * grow
    }
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform3fv(g.uB, data)
    gl.uniform1i(g.uN, n)
    const p = pointer ?? { x: 0, y: 0, s: 0 }
    gl.uniform3f(g.uP, p.x * dpr, p.y * dpr, p.s * 0.42)
    gl.uniform1f(g.uW, unit * 0.2 * dpr)
    gl.uniform1f(g.uK, 7 / (unit * dpr))
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  })

  return <canvas ref={ref} style={{ position: 'absolute', left: 0, top: 0, width, height, ...style }} />
}
