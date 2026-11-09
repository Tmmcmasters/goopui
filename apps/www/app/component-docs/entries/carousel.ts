import { effect, preset, speed } from '../controls'
import { defineComponentDoc } from '../types'

export default defineComponentDoc({
  slug: 'carousel',
  title: 'Carousel',
  category: 'Layout',
  component: 'GoopCarousel',
  code: `<GoopCarousel class="w-full max-w-xs"{{main}}>
  <GoopCarouselContent>
    <GoopCarouselItem v-for="i in 5" :key="i">
      <div class="p-1">
        <GoopCard class="aspect-square items-center justify-center">
          <span class="text-4xl font-semibold">{{ i }}</span>
        </GoopCard>
      </div>
    </GoopCarouselItem>
  </GoopCarouselContent>
  <GoopCarouselPrevious />
  <GoopCarouselNext />
  <GoopCarouselDots class="mt-4" />
</GoopCarousel>`,
  controls: [
    preset(),
    speed(),
    effect('stretch', { type: 'boolean' }),
    effect('slosh', { type: 'boolean' }),
    effect('rubberBand', { type: 'boolean' }),
    effect('dots', { type: 'boolean' }),
    effect('squish', { type: 'boolean' }),
  ],
  tables: {
    main: {
      caption: 'GoopCarousel props',
      rows: [
        { prop: 'opts', type: 'EmblaOptionsType', def: '{}', note: `Embla options, as in shadcn (align, loop, dragFree, ...). axis comes from orientation.` },
        { prop: 'plugins', type: 'EmblaPluginType[]', def: '[]', note: 'Embla plugins, e.g. embla-carousel-autoplay.' },
        { prop: 'orientation', type: `'horizontal' | 'vertical'`, def: `'horizontal'`, note: 'Scroll direction.' },
        { prop: 'setApi', type: '(api) => void', def: '-', note: 'Called with the embla API once it exists (same as @init-api).' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn Carousel.' },
        { prop: 'stretch', type: 'boolean | number', def: 'true', note: 'Slides stretch a little along the motion with momentum and wobble when they snap. A number (0 to 2) scales it.' },
        { prop: 'slosh', type: 'boolean | number', def: 'true', note: `Slide edges slosh in low, wide mounds with the scroll velocity, in the slide's own colour.` },
        { prop: 'rubberBand', type: 'boolean | number', def: 'true', note: 'Dragging past the first or last slide: its outer edge reaches back as one low, wide goo mound.' },
        { prop: 'dots', type: 'boolean', def: 'true', note: `GoopCarouselDots: the active dot is one goo blob that flows between dots. false gives flat dots.` },
        { prop: 'squish', type: 'boolean', def: 'true', note: 'Previous and Next squish when pressed, like GoopButton.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the dots blob is drawn.' },
      ],
    },
  },
  reactCode: `<GoopCarousel className="w-full max-w-xs"{{main}}>
  <GoopCarouselContent>
    {Array.from({ length: 5 }, (_, i) => (
      <GoopCarouselItem key={i}>
        <div className="p-1">
          <GoopCard className="aspect-square items-center justify-center">
            <span className="text-4xl font-semibold">{i + 1}</span>
          </GoopCard>
        </div>
      </GoopCarouselItem>
    ))}
  </GoopCarouselContent>
  <GoopCarouselPrevious />
  <GoopCarouselNext />
  <GoopCarouselDots className="mt-4" />
</GoopCarousel>`,
  reactTables: {
    main: {
      caption: 'GoopCarousel props',
      rows: [
        { prop: 'opts', type: 'EmblaOptionsType', def: '{}', note: `Embla options, as in shadcn (align, loop, dragFree, ...). axis comes from orientation.` },
        { prop: 'plugins', type: 'EmblaPluginType[]', def: '[]', note: 'Embla plugins, e.g. embla-carousel-autoplay.' },
        { prop: 'orientation', type: `'horizontal' | 'vertical'`, def: `'horizontal'`, note: 'Scroll direction.' },
        { prop: 'setApi', type: '(api: CarouselApi) => void', def: '', note: 'Called with the embla API once it exists, as in shadcn.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn Carousel.' },
        { prop: 'stretch', type: 'boolean | number', def: 'true', note: 'Slides stretch a little along the motion with momentum and wobble when they snap. A number (0 to 2) scales it.' },
        { prop: 'slosh', type: 'boolean | number', def: 'true', note: `Slide edges slosh in low, wide mounds with the scroll velocity, in the slide's own colour.` },
        { prop: 'rubberBand', type: 'boolean | number', def: 'true', note: 'Dragging past the first or last slide: its outer edge reaches back as one low, wide goo mound.' },
        { prop: 'dots', type: 'boolean', def: 'true', note: `GoopCarouselDots: the active dot is one goo blob that flows between dots. false gives flat dots.` },
        { prop: 'squish', type: 'boolean', def: 'true', note: 'Previous and Next squish when pressed, like GoopButton.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the dots blob is drawn.' },
        { prop: 'goopRef', type: 'Ref<CarouselHandle>', def: '', note: 'The live slide goo handle (null when off or before mount).' },
        { prop: 'className', type: 'string', def: '', note: 'Merged onto the root.' },
      ],
    },
  },
})
