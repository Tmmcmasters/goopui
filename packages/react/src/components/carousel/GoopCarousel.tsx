'use client'
// GoopCarousel: shadcn/ui's Carousel (embla-carousel-react; `opts`, `plugins`, `orientation`,
// `setApi`, arrow keys, `className` merge) whose slides feel like jelly, driven by embla's real
// motion (core `attachCarousel`), exactly as @goopui/vue's GoopCarousel:
//  - `stretch`: slides stretch a little along the motion with momentum and wobble on the snap;
//  - `slosh`: their leading / trailing edges slosh in low, wide mounds in the slide's colour;
//  - `rubberBand`: dragging past the first / last slide, its outer edge reaches back as one
//    low, wide mound (never past the carousel's edge: the viewport clips, so the page's scroll
//    size never changes).
// Previous / Next squish like GoopButton (`squish`); GoopCarouselDots' active blob flows
// between dots (`dots`). `goo={false}` is plain shadcn. Slide groups get "N of M" labels.
// Reduced motion: plain embla (no stretch, slosh or band), and prev / next / dots jump.
// SSR renders shadcn's markup; embla and the goo start after hydration.
import { attachCarousel, attachCarouselDots, isReducedMotion, type CarouselHandle, type MenuHighlightHandle } from '@goopui/core'
import { cn } from 'cn'
import useEmblaCarousel, { type UseEmblaCarouselType } from 'embla-carousel-react'
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
} from 'react'
import { useGoopConfig } from '../../config'
import { CAROUSEL_PROP_KEYS, splitProps, toCarouselOptions, type GoopCarouselProps, type ResolvedCarouselGoo } from '../../goop-props'
import { useComposedRefs, useIsomorphicLayoutEffect, useStableValue } from '../../utils'
import { GoopButton, type GoopButtonProps } from '../button/GoopButton'

// shadcn/ui's carousel types, verbatim.
export type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
export type CarouselEmblaOptions = UseCarouselParameters[0]
export type CarouselEmblaPlugin = UseCarouselParameters[1]

export interface CarouselContextProps {
  /** Callback ref for embla's viewport (GoopCarouselContent binds it). */
  carouselRef: UseEmblaCarouselType[0]
  /** The embla API (undefined before mount). */
  api: CarouselApi
  scrollPrev: () => void
  scrollNext: () => void
  /** Scroll to snap `index` (GoopCarouselDots). */
  scrollTo: (index: number) => void
  canScrollPrev: boolean
  canScrollNext: boolean
  opts?: CarouselEmblaOptions
  orientation: 'horizontal' | 'vertical'
  /** Selected snap index. */
  selectedIndex: number
  /** Number of snaps (dots). */
  snapCount: number
  /** What each part's goo does (from the carousel's props). */
  goo: ResolvedCarouselGoo
}

const CarouselContext = createContext<CarouselContextProps | null>(null)

/** The surrounding GoopCarousel's state (throws outside one, like shadcn's). */
export function useCarousel(): CarouselContextProps {
  const ctx = useContext(CarouselContext)
  if (!ctx) throw new Error('useCarousel must be used within a <GoopCarousel />')
  return ctx
}

/** The slide labels this carousel wrote (it never overwrites a label you set). */
const AUTO_LABEL = 'data-goop-auto-label'

/** How far embla's content is dragged past an end, px: > 0 past the start, < 0 past the end. */
export function emblaOverscroll(api: CarouselApi): number {
  if (!api) return 0
  const engine = api.internalEngine()
  if (engine.options.loop) return 0
  const loc = engine.location.get()
  const { min, max } = engine.limit
  const past = loc > max ? loc - max : loc < min ? loc - min : 0
  return engine.options.direction === 'rtl' ? -past : past
}

export type GoopCarouselRootProps = Omit<ComponentPropsWithoutRef<'div'>, keyof GoopCarouselProps> &
  GoopCarouselProps & {
    /** Embla options (`axis` comes from `orientation`). */
    opts?: CarouselEmblaOptions
    /** Embla plugins (e.g. embla-carousel-autoplay). */
    plugins?: CarouselEmblaPlugin
    orientation?: 'horizontal' | 'vertical'
    /** Called with the embla API once it exists. */
    setApi?: (api: CarouselApi) => void
    /** Receives the live slide goo handle (null when off or before mount). */
    goopRef?: Ref<CarouselHandle>
  }

export const GoopCarousel = forwardRef<HTMLDivElement, GoopCarouselRootProps>(function GoopCarousel(allProps, ref) {
  const [engine, props] = splitProps(allProps, CAROUSEL_PROP_KEYS)
  const { orientation = 'horizontal', opts, setApi, plugins, className, children, goopRef, onKeyDownCapture, ...rest } = props

  const config = useGoopConfig()
  const goo = useStableValue(toCarouselOptions(engine, config))
  const axis = orientation === 'horizontal' ? ('x' as const) : ('y' as const)
  const [carouselRef, api] = useEmblaCarousel({ ...opts, axis }, plugins)

  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [snapCount, setSnapCount] = useState(0)
  const slides = useRef<CarouselHandle | null>(null)
  const [slidesHandle, setSlidesHandle] = useState<CarouselHandle | null>(null)

  /** Reduced motion: app config forces it, else the OS / `<html data-reduced-motion>`. */
  const reducedRef = useRef(goo.reducedMotion)
  reducedRef.current = goo.reducedMotion
  const reduced = useCallback((): boolean => {
    const rm = reducedRef.current
    if (rm === true || rm === false) return rm
    return typeof document !== 'undefined' && isReducedMotion(document)
  }, [])
  const scrollPrev = useCallback(() => api?.scrollPrev(reduced()), [api, reduced])
  const scrollNext = useCallback(() => api?.scrollNext(reduced()), [api, reduced])
  const scrollTo = useCallback((index: number) => api?.scrollTo(index, reduced()), [api, reduced])

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDownCapture?.(event)
      const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft'
      const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight'
      if (event.key === prevKey) {
        event.preventDefault()
        scrollPrev()
      } else if (event.key === nextKey) {
        event.preventDefault()
        scrollNext()
      }
    },
    [orientation, scrollPrev, scrollNext, onKeyDownCapture],
  )

  const setApiNow = useRef(setApi)
  setApiNow.current = setApi
  useIsomorphicLayoutEffect(() => {
    if (api) setApiNow.current?.(api)
  }, [api])

  // embla's events: selection state, "N of M" labels, and the slide goo's motion feed.
  useIsomorphicLayoutEffect(() => {
    if (!api) return
    const onSelect = (a: NonNullable<CarouselApi>) => {
      setCanScrollPrev(a.canScrollPrev())
      setCanScrollNext(a.canScrollNext())
      setSelectedIndex(a.selectedScrollSnap())
      setSnapCount(a.scrollSnapList().length)
    }
    const label = (a: NonNullable<CarouselApi>) => {
      const nodes = a.slideNodes()
      nodes.forEach((n, i) => {
        if (n.hasAttribute('aria-label') && !n.hasAttribute(AUTO_LABEL)) return
        n.setAttribute('aria-label', `${i + 1} of ${nodes.length}`)
        n.setAttribute(AUTO_LABEL, '')
      })
    }
    const onReInit = (a: NonNullable<CarouselApi>) => {
      onSelect(a)
      label(a)
      slides.current?.refresh()
    }
    const track = () => slides.current?.track()
    onSelect(api)
    label(api)
    api.on('reInit', onReInit).on('select', onSelect).on('slidesChanged', onReInit).on('scroll', track).on('pointerDown', track)
    return () => {
      api.off('reInit', onReInit).off('select', onSelect).off('slidesChanged', onReInit).off('scroll', track).off('pointerDown', track)
    }
  }, [api])

  // The slide goo: attach / update / detach as embla and the options change.
  useIsomorphicLayoutEffect(() => {
    const opts = goo.slides
    if (!api || !opts) {
      if (slides.current) {
        slides.current.destroy()
        slides.current = null
        setSlidesHandle(null)
      }
      return
    }
    const full = { ...opts, axis, overscroll: () => emblaOverscroll(api) }
    if (slides.current) slides.current.update(full)
    else {
      slides.current = attachCarousel(api.rootNode(), full)
      setSlidesHandle(slides.current)
    }
  }, [api, goo, axis])
  // A new embla instance (re-created viewport) gets a fresh goo; unmount detaches.
  useIsomorphicLayoutEffect(
    () => () => {
      slides.current?.destroy()
      slides.current = null
    },
    [api],
  )
  useImperativeHandle(goopRef, () => slidesHandle as CarouselHandle, [slidesHandle])

  const ctx = useMemo<CarouselContextProps>(
    () => ({
      carouselRef,
      api,
      opts,
      orientation,
      scrollPrev,
      scrollNext,
      scrollTo,
      canScrollPrev,
      canScrollNext,
      selectedIndex,
      snapCount,
      goo,
    }),
    [carouselRef, api, opts, orientation, scrollPrev, scrollNext, scrollTo, canScrollPrev, canScrollNext, selectedIndex, snapCount, goo],
  )

  return (
    <CarouselContext.Provider value={ctx}>
      <div
        ref={ref}
        onKeyDownCapture={onKeyDown}
        className={cn('relative', className)}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        data-orientation={orientation}
        {...rest}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  )
})
GoopCarousel.displayName = 'GoopCarousel'

/** shadcn/ui's CarouselContent. The outer element is embla's viewport (it clips, so the slosh
 *  never reaches the page's scroll size); props and `className` go on the inner flex track. */
export const GoopCarouselContent = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(function GoopCarouselContent(
  { className, ...props },
  ref,
) {
  const { carouselRef, orientation } = useCarousel()
  return (
    <div ref={carouselRef} className="overflow-hidden" data-slot="carousel-content">
      <div ref={ref} className={cn('flex', orientation === 'horizontal' ? '-ml-4' : '-mt-4 flex-col', className)} {...props} />
    </div>
  )
})
GoopCarouselContent.displayName = 'GoopCarouselContent'

/** shadcn/ui's CarouselItem (a `role="group"` slide). The goo stretches and redraws the slide's
 *  surface: mark it `data-goop-surface`, or core uses the first descendant that paints a
 *  background (e.g. a Card). */
export const GoopCarouselItem = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(function GoopCarouselItem({ className, ...props }, ref) {
  const { orientation } = useCarousel()
  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      className={cn('min-w-0 shrink-0 grow-0 basis-full', orientation === 'horizontal' ? 'pl-4' : 'pt-4', className)}
      {...props}
    />
  )
})
GoopCarouselItem.displayName = 'GoopCarouselItem'

export type GoopCarouselButtonProps = GoopButtonProps

/** shadcn/ui's CarouselPrevious (an outline `icon-sm` round button), as a GoopButton that
 *  squishes on press. The carousel's `squish` (or `goo`) off makes it a plain shadcn button.
 *  Under reduced motion the slides jump instead of gliding. */
export const GoopCarouselPrevious = forwardRef<HTMLButtonElement, GoopCarouselButtonProps>(function GoopCarouselPrevious(
  { className, variant = 'outline', size = 'icon-sm', onClick, children, ...props },
  ref,
) {
  const { orientation, scrollPrev, canScrollPrev, goo } = useCarousel()
  return (
    <GoopButton
      ref={ref}
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      {...goo.button}
      className={cn(
        'absolute touch-manipulation rounded-full',
        orientation === 'horizontal' ? 'inset-y-0 -left-12 my-auto' : '-top-12 left-1/2 -translate-x-1/2 rotate-90',
        className,
      )}
      disabled={!canScrollPrev}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        onClick?.(e)
        scrollPrev()
      }}
      {...props}
    >
      {children ?? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="cn-rtl-flip">
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span className="sr-only">Previous slide</span>
        </>
      )}
    </GoopButton>
  )
})
GoopCarouselPrevious.displayName = 'GoopCarouselPrevious'

/** shadcn/ui's CarouselNext, as a squishy GoopButton (see GoopCarouselPrevious). */
export const GoopCarouselNext = forwardRef<HTMLButtonElement, GoopCarouselButtonProps>(function GoopCarouselNext(
  { className, variant = 'outline', size = 'icon-sm', onClick, children, ...props },
  ref,
) {
  const { orientation, scrollNext, canScrollNext, goo } = useCarousel()
  return (
    <GoopButton
      ref={ref}
      data-slot="carousel-next"
      variant={variant}
      size={size}
      {...goo.button}
      className={cn(
        'absolute touch-manipulation rounded-full',
        orientation === 'horizontal' ? 'inset-y-0 -right-12 my-auto' : '-bottom-12 left-1/2 -translate-x-1/2 rotate-90',
        className,
      )}
      disabled={!canScrollNext}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        onClick?.(e)
        scrollNext()
      }}
      {...props}
    >
      {children ?? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="cn-rtl-flip">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className="sr-only">Next slide</span>
        </>
      )}
    </GoopButton>
  )
})
GoopCarouselNext.displayName = 'GoopCarouselNext'

export type GoopCarouselDotsProps = ComponentPropsWithoutRef<'div'> & {
  /** Receives the live dots blob handle (null before mount / when the blob is off). */
  goopRef?: Ref<MenuHighlightHandle>
}

/**
 * GoopCarouselDots (a goopUI addition; shadcn has no dots): one button per snap, the active one
 * `aria-current` and `data-state="active"`. With the carousel's `dots` on, the active fill is
 * ONE goo blob (core `attachCarouselDots`, the Tabs indicator engine) that flows from dot to dot
 * with momentum and lands with a jelly overshoot; off, flat dots. Place it inside GoopCarousel.
 * Reduced motion: the blob snaps and the slides jump. SSR renders no dots (embla counts the
 * snaps on the client); goop.css keeps the active dot filled until the blob attaches.
 */
export const GoopCarouselDots = forwardRef<HTMLDivElement, GoopCarouselDotsProps>(function GoopCarouselDots({ className, goopRef, ...props }, ref) {
  const { snapCount, selectedIndex, scrollTo, goo, orientation } = useCarousel()
  const el = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const handle = useRef<MenuHighlightHandle | null>(null)
  const [live, setLive] = useState<MenuHighlightHandle | null>(null)

  useIsomorphicLayoutEffect(() => {
    const list = el.current
    const opts = goo.dots
    if (!list || !opts) {
      if (handle.current) {
        handle.current.destroy()
        handle.current = null
        setLive(null)
      }
      return
    }
    if (handle.current) handle.current.update(opts)
    else {
      handle.current = attachCarouselDots(list, opts)
      setLive(handle.current)
    }
  }, [goo.dots])
  useIsomorphicLayoutEffect(
    () => () => {
      handle.current?.destroy()
      handle.current = null
    },
    [],
  )
  // The active dot (or the number of dots) changed: the blob flows to it.
  useIsomorphicLayoutEffect(() => {
    handle.current?.refresh()
  }, [snapCount, selectedIndex])
  useImperativeHandle(goopRef, () => live as MenuHighlightHandle, [live])

  return (
    <div
      ref={composed}
      data-slot="carousel-dots"
      data-goop-carousel-dots={goo.dots ? '' : undefined}
      data-orientation={orientation}
      className={cn('flex items-center justify-center gap-4', orientation === 'vertical' && 'flex-col', className)}
      {...props}
    >
      {Array.from({ length: snapCount }, (_, i) => (
        <button
          key={i}
          type="button"
          data-goop-carousel-dot=""
          data-state={selectedIndex === i ? 'active' : 'inactive'}
          aria-current={selectedIndex === i ? 'true' : undefined}
          aria-label={`Go to slide ${i + 1}`}
          className="relative size-2.5 rounded-full bg-primary/20 outline-none transition-colors after:absolute after:-inset-2 after:content-[''] hover:bg-primary/35 focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=active]:bg-primary"
          onClick={() => scrollTo(i)}
        />
      ))}
    </div>
  )
})
GoopCarouselDots.displayName = 'GoopCarouselDots'
