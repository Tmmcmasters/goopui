// Tiny imperative DOM helper for scene builders (scenes own their subtree, React doesn't).

export interface ElProps {
  class?: string
  style?: string
  attrs?: Record<string, string>
  text?: string
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElProps = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (props.class) e.className = props.class
  if (props.style) e.style.cssText = props.style
  if (props.attrs) for (const [k, v] of Object.entries(props.attrs)) e.setAttribute(k, v)
  if (props.text !== undefined) e.textContent = props.text
  for (const c of children) e.append(c)
  return e
}

/** Inline SVG from markup. */
export function svg(markup: string): SVGSVGElement {
  const t = document.createElement('template')
  t.innerHTML = markup.trim()
  return t.content.firstElementChild as SVGSVGElement
}

export const clamp01 = (u: number): number => Math.min(1, Math.max(0, u))
export const smooth = (u: number): number => {
  const x = clamp01(u)
  return x * x * (3 - 2 * x)
}
export const outCubic = (u: number): number => 1 - Math.pow(1 - clamp01(u), 3)
/** Underdamped settle 0 -> 1 (UI moves that should feel springy, like sonner's). */
export const springy = (u: number): number => {
  const x = Math.max(0, u)
  if (x >= 1.6) return 1
  return 1 - Math.exp(-6 * x) * Math.cos(7 * x)
}

/** Fade-and-rise entrance for a scene's content (translate only: sizes stay real, so core's
 *  measurements are unaffected). Returns [opacity, translateY px]. */
export const entrance = (t: number, delay = 0, dur = 0.42): [number, number] => {
  const u = (t - delay) / dur
  if (u >= 1) return [1, 0]
  return [smooth(u * 1.4), (1 - outCubic(u)) * 18]
}
