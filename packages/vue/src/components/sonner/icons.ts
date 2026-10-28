// The lucide icons shadcn-vue's Sonner passes to vue-sonner (CircleCheck, Info, TriangleAlert,
// OctagonX, Loader2, X), inlined so @goopui/vue doesn't depend on an icon package. Same
// markup as lucide: 24px viewBox, currentColor stroke, width 2, round caps and joins.
import { defineComponent, h } from 'vue'

const icon = (name: string, paths: string[], circle = false) =>
  defineComponent({
    name,
    setup(_, { attrs }) {
      return () =>
        h(
          'svg',
          {
            xmlns: 'http://www.w3.org/2000/svg',
            width: 24,
            height: 24,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': 2,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            'aria-hidden': 'true',
            ...attrs,
          },
          [circle ? h('circle', { cx: 12, cy: 12, r: 10 }) : null, ...paths.map((d) => h('path', { d }))],
        )
    },
  })

export const CircleCheckIcon = icon('CircleCheckIcon', ['m9 12 2 2 4-4'], true)
export const InfoIcon = icon('InfoIcon', ['M12 16v-4', 'M12 8h.01'], true)
export const TriangleAlertIcon = icon('TriangleAlertIcon', [
  'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3',
  'M12 9v4',
  'M12 17h.01',
])
export const OctagonXIcon = icon('OctagonXIcon', [
  'm15 9-6 6',
  'M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z',
  'm9 9 6 6',
])
export const Loader2Icon = icon('Loader2Icon', ['M21 12a9 9 0 1 1-6.219-8.56'])
export const XIcon = icon('XIcon', ['M18 6 6 18', 'm6 6 12 12'])
