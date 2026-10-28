// shadcn-vue's Slider classes (reka-nova), verbatim, one string per part.

export const sliderRootClass =
  'data-vertical:min-h-40 relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:w-auto data-vertical:flex-col'
export const sliderTrackClass =
  'bg-muted rounded-full data-horizontal:h-1 data-vertical:w-1 relative grow overflow-hidden data-horizontal:w-full data-vertical:h-full'
export const sliderRangeClass = 'bg-primary absolute select-none data-horizontal:h-full data-vertical:w-full'
export const sliderThumbClass =
  'border-ring ring-ring/50 relative size-3 rounded-full border bg-white transition-[color,box-shadow] after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 block shrink-0 select-none disabled:pointer-events-none disabled:opacity-50'

/** While the goo is attached the real range and thumb are see-through (the goo draws them);
 *  the thumb keeps its focus / hover ring. */
export const goopSliderRangeStyle = { backgroundColor: 'transparent' } as const
export const goopSliderThumbStyle = { backgroundColor: 'transparent', borderColor: 'transparent' } as const
