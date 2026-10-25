import { createSvgFilterRenderer, type GoopRendererFactory } from '../renderer'
import { createCanvasRenderer } from './canvas'

/** Built-in renderers selectable by name. */
export type GoopRendererName = 'svg' | 'canvas'

/** `renderer` option value: a built-in name or any custom factory. */
export type GoopRendererOption = GoopRendererName | GoopRendererFactory

/** Resolve a `renderer` option to a factory. Default (undefined) is the SVG filter. */
export function resolveRenderer(r: GoopRendererOption | undefined): GoopRendererFactory {
  if (typeof r === 'function') return r
  if (r === 'canvas') return createCanvasRenderer
  return createSvgFilterRenderer
}
