// The lucide icons shadcn/ui's Sonner passes to sonner (CircleCheck, Info, TriangleAlert,
// OctagonX, Loader2), inlined so @goopui/react doesn't depend on an icon package. Same markup
// as lucide (and as @goopui/vue's): 24px viewBox, currentColor stroke, width 2, round caps.
import type { SVGProps } from 'react'

const icon = (paths: string[], circle = false) =>
  function Icon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {circle ? <circle cx="12" cy="12" r="10" /> : null}
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    )
  }

export const CircleCheckIcon = icon(['m9 12 2 2 4-4'], true)
export const InfoIcon = icon(['M12 16v-4', 'M12 8h.01'], true)
export const TriangleAlertIcon = icon(['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'])
export const OctagonXIcon = icon([
  'm15 9-6 6',
  'M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z',
  'm9 9 6 6',
])
export const Loader2Icon = icon(['M21 12a9 9 0 1 1-6.219-8.56'])
export const XIcon = icon(['M18 6 6 18', 'm6 6 12 12'])
