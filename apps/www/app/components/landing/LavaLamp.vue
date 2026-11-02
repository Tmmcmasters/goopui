<script setup lang="ts">
// Full-bleed lava-lamp goo behind the landing hero. A tiny WebGL metaball shader: a handful
// of Slime blobs drift on slow Lissajous paths, merging and splitting where their fields
// overlap. The cursor/finger adds a wide, shallow gaussian to the field, so nearby blob edges
// swell into low, broad mounds (never a knob) and an empty spot stays empty.
//
// Cost: one full-screen quad, <= 7 blobs, DPR capped (1.5 desktop, 1.25 phones), ~30fps on
// touch devices. The loop stops when the canvas is off-screen, the tab is hidden, or motion is
// reduced (OS setting or the site's switch): then it draws one still frame. No WebGL = the CSS
// poster underneath stays.
const canvas = ref<HTMLCanvasElement | null>(null)
const ready = ref(false)
const { reduced } = useMotionPreference()

type Blob = { bx: number; by: number; ax: number; ay: number; fx: number; fy: number; px: number; py: number; r: number; fr: number }

// Positions are fractions of the canvas; r is a fraction of sqrt(w*h). Periods are 40-90s.
const DESKTOP: Blob[] = [
  { bx: 0.78, by: 0.34, ax: 0.1, ay: 0.16, fx: 0.11, fy: 0.083, px: 0.0, py: 1.2, r: 0.098, fr: 0.111 },
  { bx: 0.66, by: 0.62, ax: 0.12, ay: 0.14, fx: 0.077, fy: 0.12, px: 2.1, py: 0.4, r: 0.085, fr: 0.145 },
  { bx: 0.9, by: 0.72, ax: 0.08, ay: 0.18, fx: 0.093, fy: 0.07, px: 4.0, py: 2.6, r: 0.072, fr: 0.093 },
  { bx: 0.58, by: 0.24, ax: 0.09, ay: 0.12, fx: 0.13, fy: 0.1, px: 1.1, py: 3.3, r: 0.060, fr: 0.162 },
  { bx: 0.86, by: 0.2, ax: 0.07, ay: 0.08, fx: 0.071, fy: 0.13, px: 5.2, py: 0.9, r: 0.051, fr: 0.128 },
  { bx: 0.18, by: 1.02, ax: 0.14, ay: 0.06, fx: 0.065, fy: 0.09, px: 3.0, py: 4.4, r: 0.102, fr: 0.085 },
  { bx: 0.45, by: 0.92, ax: 0.1, ay: 0.08, fx: 0.105, fy: 0.08, px: 0.7, py: 5.1, r: 0.064, fr: 0.136 },
]
// Phones: the copy fills the top, so the lamp lives in the lower half and the right edge.
const PHONE: Blob[] = [
  { bx: 0.78, by: 0.74, ax: 0.16, ay: 0.08, fx: 0.11, fy: 0.083, px: 0.0, py: 1.2, r: 0.119, fr: 0.111 },
  { bx: 0.3, by: 0.86, ax: 0.18, ay: 0.06, fx: 0.077, fy: 0.12, px: 2.1, py: 0.4, r: 0.111, fr: 0.145 },
  { bx: 0.6, by: 0.96, ax: 0.2, ay: 0.05, fx: 0.093, fy: 0.07, px: 4.0, py: 2.6, r: 0.102, fr: 0.093 },
  { bx: 0.96, by: 0.48, ax: 0.06, ay: 0.12, fx: 0.13, fy: 0.1, px: 1.1, py: 3.3, r: 0.085, fr: 0.162 },
  { bx: 0.1, by: 0.64, ax: 0.08, ay: 0.06, fx: 0.071, fy: 0.13, px: 5.2, py: 0.9, r: 0.068, fr: 0.128 },
]
const MAX = 7

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`
// Phone GPUs honour mediump (fp16, max ~65504): pixel-space distances squared overflow it, so
// blobs stop merging and the lighting turns to noise. Ask for highp, and measure distances in
// screen heights (S) so the numbers stay small even where highp is missing.
const FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec3 uB[${MAX}];
uniform int uN;
uniform vec2 uRes;
uniform vec3 uP; // pointer x, y, strength
uniform float uW; // pointer mound width (px)
uniform float uK; // normal steepness (1/px)
float field(vec2 q){
  float f=0.;
  for(int i=0;i<${MAX};i++){
    if(i>=uN)break;
    float S=1./uRes.y;
    vec2 d=(q-uB[i].xy)*S;
    float r=uB[i].z*S;
    float r2=r*r;
    // Softened 1/d^2: no spike at the centre, so each lobe is a smooth dome.
    f+=r2/(dot(d,d)+.3*r2);
  }
  return f;
}
float total(vec2 q){
  vec2 dp=(q-uP.xy)/uW;
  return field(q)+uP.z*exp(-dot(dp,dp));
}
// Height of the goo surface: 0 at the edge, rising toward each blob's middle.
float height(float f){return clamp(1.-1./max(f,.001),0.,1.);}
void main(){
  vec2 q=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  float f=total(q);
  float body=smoothstep(0.96,1.04,f);
  float hgt=height(f);
  // Fake 3D: a normal from the height field, lit from the upper left.
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

let stop = () => {}

onMounted(() => {
  const el = canvas.value
  if (!el) return
  const gl = el.getContext('webgl', { antialias: false, premultipliedAlpha: true, alpha: true, powerPreference: 'low-power' })
  if (!gl) return

  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
  gl.useProgram(prog)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const uB = gl.getUniformLocation(prog, 'uB')
  const uN = gl.getUniformLocation(prog, 'uN')
  const uRes = gl.getUniformLocation(prog, 'uRes')
  const uP = gl.getUniformLocation(prog, 'uP')
  const uW = gl.getUniformLocation(prog, 'uW')
  const uK = gl.getUniformLocation(prog, 'uK')

  const coarse = matchMedia('(pointer: coarse)').matches
  const data = new Float32Array(MAX * 3)
  let w = 0
  let h = 0
  let dpr = 1
  let blobs = DESKTOP
  // Sim time starts mid-drift so the first frame already looks composed.
  let t = 24
  let last = 0
  let raf = 0
  let visible = true
  // Pointer, in CSS px relative to the canvas; strength eases in/out.
  const ptr = { x: 0, y: 0, tx: 0, ty: 0, s: 0, ts: 0 }

  function draw() {
    const unit = Math.sqrt(w * h)
    for (let i = 0; i < blobs.length; i++) {
      const b = blobs[i]!
      data[i * 3] = (b.bx + b.ax * Math.sin(t * b.fx + b.px)) * w * dpr
      data[i * 3 + 1] = (b.by + b.ay * Math.sin(t * b.fy + b.py)) * h * dpr
      data[i * 3 + 2] = b.r * 1.12 * unit * (1 + 0.14 * Math.sin(t * b.fr + b.px * 1.7)) * dpr
    }
    gl!.uniform3fv(uB, data)
    gl!.uniform1i(uN, blobs.length)
    // Shallow and wide: lifts nearby edges into a gentle mound, can't form a blob alone.
    gl!.uniform3f(uP, ptr.x * dpr, ptr.y * dpr, ptr.s * 0.42)
    gl!.uniform1f(uW, unit * 0.2 * dpr)
    gl!.uniform1f(uK, 7 / (unit * dpr))
    gl!.drawArrays(gl!.TRIANGLES, 0, 3)
  }

  function resize() {
    const r = el!.getBoundingClientRect()
    w = Math.max(1, r.width)
    h = Math.max(1, r.height)
    dpr = Math.min(window.devicePixelRatio || 1, w < 640 ? 1.25 : 1.5)
    blobs = w < 768 ? PHONE : DESKTOP
    el!.width = Math.round(w * dpr)
    el!.height = Math.round(h * dpr)
    gl!.viewport(0, 0, el!.width, el!.height)
    gl!.uniform2f(uRes, el!.width, el!.height)
    draw()
    ready.value = true
  }

  function frame(now: number) {
    raf = 0
    const dt = last ? Math.min(now - last, 100) / 1000 : 0
    // Touch devices: ~30fps is plenty for something this slow.
    if (coarse && dt > 0 && dt < 0.03) {
      raf = requestAnimationFrame(frame)
      return
    }
    last = now
    t += dt
    const k = 1 - Math.exp(-dt * 6)
    ptr.x += (ptr.tx - ptr.x) * k
    ptr.y += (ptr.ty - ptr.y) * k
    ptr.s += (ptr.ts - ptr.s) * (1 - Math.exp(-dt * 3))
    draw()
    raf = requestAnimationFrame(frame)
  }

  function sync() {
    const run = visible && !document.hidden && !reduced.value
    if (run && !raf) {
      last = 0
      raf = requestAnimationFrame(frame)
    } else if (!run && raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
    if (reduced.value) {
      ptr.s = ptr.ts = 0
      draw()
    }
  }

  function onMove(e: PointerEvent) {
    if (!raf) return
    const r = el!.getBoundingClientRect()
    ptr.tx = e.clientX - r.left
    ptr.ty = e.clientY - r.top
    if (ptr.s < 0.01) {
      ptr.x = ptr.tx
      ptr.y = ptr.ty
    }
    ptr.ts = 1
  }
  const onLeave = () => (ptr.ts = 0)
  const onUp = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') ptr.ts = 0
  }

  const ro = new ResizeObserver(resize)
  ro.observe(el)
  const io = new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting
    sync()
  })
  io.observe(el)
  document.addEventListener('visibilitychange', sync)
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onMove, { passive: true })
  window.addEventListener('pointerup', onUp, { passive: true })
  window.addEventListener('pointercancel', onLeave, { passive: true })
  document.documentElement.addEventListener('pointerleave', onLeave)
  el.addEventListener('webglcontextlost', () => {
    cancelAnimationFrame(raf)
    raf = 0
    ready.value = false
  })
  const unwatch = watch(reduced, sync)
  sync()

  stop = () => {
    cancelAnimationFrame(raf)
    raf = 0
    ro.disconnect()
    io.disconnect()
    unwatch()
    document.removeEventListener('visibilitychange', sync)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerdown', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onLeave)
    document.documentElement.removeEventListener('pointerleave', onLeave)
  }
})
onBeforeUnmount(() => stop())
</script>

<template>
  <div class="lava" aria-hidden="true">
    <div class="poster" :data-hidden="ready || undefined" />
    <canvas ref="canvas" class="canvas" :data-ready="ready || undefined" />
    <div class="veil" />
  </div>
</template>

<style scoped>
.lava {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}
.canvas,
.poster {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.canvas {
  opacity: 0;
  transition: opacity 900ms ease;
}
.canvas[data-ready] {
  opacity: 1;
}
/* Before mount / no WebGL: soft green pools where the blobs will be. */
.poster {
  background:
    radial-gradient(circle at 76% 38%, rgb(31 166 74 / 0.55), transparent 22%),
    radial-gradient(circle at 64% 64%, rgb(31 166 74 / 0.45), transparent 20%),
    radial-gradient(circle at 90% 74%, rgb(31 166 74 / 0.4), transparent 16%);
  filter: blur(8px);
  transition: opacity 900ms ease;
}
.poster[data-hidden] {
  opacity: 0;
}
/* Keeps the copy readable: the page color washes over the blobs behind the text, and the
   lamp fades into the page at the bottom. */
.veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to top, var(--background) 0%, transparent 16%),
    linear-gradient(100deg, var(--background) 0%, color-mix(in oklch, var(--background) 82%, transparent) 30%, color-mix(in oklch, var(--background) 30%, transparent) 52%, transparent 66%);
}
@media (max-width: 767px) {
  .poster {
    background:
      radial-gradient(circle at 75% 76%, rgb(31 166 74 / 0.5), transparent 26%),
      radial-gradient(circle at 30% 88%, rgb(31 166 74 / 0.45), transparent 24%);
  }
  .veil {
    background:
      linear-gradient(to top, var(--background) 0%, transparent 10%),
      linear-gradient(180deg, var(--background) 0%, color-mix(in oklch, var(--background) 80%, transparent) 45%, color-mix(in oklch, var(--background) 25%, transparent) 70%, transparent 85%);
  }
}
</style>
