// shadcn/ui's Slider classes (React, style `radix-nova`), one string per part. shadcn's
// `data-horizontal:` / `data-vertical:` are spelled out as the `data-orientation` Radix emits.

export const sliderRootClass =
  'relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-40 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col'
export const sliderTrackClass =
  'relative grow overflow-hidden rounded-full bg-muted data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1'
export const sliderRangeClass = 'absolute bg-primary select-none data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full'
export const sliderThumbClass =
  'relative block size-3 shrink-0 rounded-full border border-ring bg-white ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50'

/** While the goo is attached the real range and thumb are see-through (the goo draws them);
 *  the thumb keeps its focus / hover ring. */
export const goopSliderRangeStyle = { backgroundColor: 'transparent' } as const
export const goopSliderThumbStyle = { backgroundColor: 'transparent', borderColor: 'transparent' } as const
