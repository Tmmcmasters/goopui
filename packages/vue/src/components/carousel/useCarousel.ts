// shadcn-vue's useCarousel (embla-carousel-vue state shared by the carousel's parts), plus the
// goo: the slide goo (core `attachCarousel`: stretch, slosh and rubber band, fed embla's
// `scroll` / `pointerDown` events and its overscroll past either end), "N of M" labels on the
// slide groups, the selected snap for GoopCarouselDots, and reduced motion (prev / next / dots
// jump instead of gliding; no slide goo). Browser-only work runs after mount.
import { attachCarousel, isReducedMotion, type CarouselHandle } from '@goopui/core'
import emblaCarouselVue from 'embla-carousel-vue'
import {
  computed,
  unref,
  inject,
  onBeforeUnmount,
  provide,
  ref,
  shallowRef,
  watch,
  type ComputedRef,
  type InjectionKey,
  type Ref,
} from 'vue'
import { useGoopConfig } from '../../config'
import { toCarouselOptions, type ResolvedCarouselGoo } from '../../goop-props'
import type { CarouselEmits, CarouselProps, UnwrapRefCarouselApi } from './interface'

export interface CarouselContext {
  /** Template ref for the viewport (GoopCarouselContent binds it). */
  carouselRef: Ref<HTMLElement | undefined>
  /** The embla API (undefined before mount). */
  carouselApi: Ref<UnwrapRefCarouselApi | undefined>
  canScrollPrev: Ref<boolean>
  canScrollNext: Ref<boolean>
  scrollPrev: () => void
  scrollNext: () => void
  /** Scroll to snap `index` (GoopCarouselDots). */
  scrollTo: (index: number) => void
  /** 'horizontal' | 'vertical' (reactive: follows the prop). */
  orientation: ComputedRef<'horizontal' | 'vertical'>
  /** Selected snap index. */
  selectedIndex: Ref<number>
  /** Number of snaps (dots). */
  snapCount: Ref<number>
  /** What each part's goo does (from the carousel's props). */
  goo: ComputedRef<ResolvedCarouselGoo>
  /** The live slide goo handle (null when off or before mount). */
  slides: Ref<CarouselHandle | null>
}

type Api = NonNullable<UnwrapRefCarouselApi>

const KEY: InjectionKey<CarouselContext> = Symbol('goopui.carousel')

/** The slide labels this carousel wrote (it never overwrites a label you set). */
const AUTO_LABEL = 'data-goop-auto-label'

/** How far embla's content is dragged past an end, px: > 0 past the start, < 0 past the end. */
export function emblaOverscroll(api: UnwrapRefCarouselApi | undefined): number {
  if (!api) return 0
  const engine = api.internalEngine()
  if (engine.options.loop) return 0
  const loc = engine.location.get()
  const { min, max } = engine.limit
  const past = loc > max ? loc - max : loc < min ? loc - min : 0
  return engine.options.direction === 'rtl' ? -past : past
}

export function useProvideCarousel(props: CarouselProps, emits: CarouselEmits): CarouselContext {
  const config = useGoopConfig()
  const orientation = computed(() => props.orientation ?? 'horizontal')
  const goo = computed(() => toCarouselOptions(props, config))
  const emblaOptions = computed(() => ({ ...props.opts, axis: orientation.value === 'horizontal' ? ('x' as const) : ('y' as const) }))
  const emblaPlugins = computed(() => unref(props.plugins) ?? [])
  const [emblaNode, emblaApi] = emblaCarouselVue(emblaOptions, emblaPlugins)

  const canScrollNext = ref(false)
  const canScrollPrev = ref(false)
  const selectedIndex = ref(0)
  const snapCount = ref(0)
  const slides = shallowRef<CarouselHandle | null>(null)

  /** Reduced motion: app config forces it, else the OS / `<html data-reduced-motion>`. */
  const reduced = (): boolean => {
    const rm = goo.value.reducedMotion
    if (rm === true || rm === false) return rm
    return typeof document !== 'undefined' && isReducedMotion(document)
  }
  const scrollPrev = (): void => emblaApi.value?.scrollPrev(reduced())
  const scrollNext = (): void => emblaApi.value?.scrollNext(reduced())
  const scrollTo = (index: number): void => emblaApi.value?.scrollTo(index, reduced())

  const label = (api: Api): void => {
    const nodes = api.slideNodes()
    nodes.forEach((n, i) => {
      if (n.hasAttribute('aria-label') && !n.hasAttribute(AUTO_LABEL)) return
      n.setAttribute('aria-label', `${i + 1} of ${nodes.length}`)
      n.setAttribute(AUTO_LABEL, '')
    })
  }

  const onSelect = (api: UnwrapRefCarouselApi | undefined): void => {
    canScrollNext.value = api?.canScrollNext() || false
    canScrollPrev.value = api?.canScrollPrev() || false
    selectedIndex.value = api?.selectedScrollSnap() ?? 0
    snapCount.value = api?.scrollSnapList().length ?? 0
  }

  const detach = (): void => {
    slides.value?.destroy()
    slides.value = null
  }
  const sync = (): void => {
    const api = emblaApi.value
    const opts = goo.value.slides
    if (!api || !opts) return detach()
    const full = { ...opts, axis: emblaOptions.value.axis, overscroll: () => emblaOverscroll(emblaApi.value) }
    if (slides.value) slides.value.update(full)
    else slides.value = attachCarousel(api.rootNode(), full)
  }

  const track = (): void => slides.value?.track()
  const onReInit = (api: Api): void => {
    onSelect(api)
    label(api)
    slides.value?.refresh()
  }

  watch(
    emblaApi,
    (api, old) => {
      if (old) {
        old.off('select', onSelect).off('reInit', onReInit).off('slidesChanged', onReInit).off('scroll', track).off('pointerDown', track)
      }
      detach()
      if (!api) return
      api.on('init', onSelect).on('reInit', onReInit).on('select', onSelect).on('slidesChanged', onReInit).on('scroll', track).on('pointerDown', track)
      onSelect(api)
      label(api)
      sync()
      props.setApi?.(api)
      emits('init-api', api)
    },
    { immediate: true, flush: 'post' },
  )
  watch([goo, emblaOptions], sync, { flush: 'post' })
  onBeforeUnmount(detach)

  const ctx: CarouselContext = {
    carouselRef: emblaNode,
    carouselApi: emblaApi,
    canScrollPrev,
    canScrollNext,
    scrollPrev,
    scrollNext,
    scrollTo,
    orientation,
    selectedIndex,
    snapCount,
    goo,
    slides,
  }
  provide(KEY, ctx)
  return ctx
}

/** The surrounding GoopCarousel's state (throws outside one, like shadcn's). */
export function useCarousel(): CarouselContext {
  const state = inject(KEY, null)
  if (!state) throw new Error('useCarousel must be used within a <GoopCarousel />')
  return state
}
