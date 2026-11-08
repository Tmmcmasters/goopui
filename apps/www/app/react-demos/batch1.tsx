/** @jsxRuntime automatic */
/** @jsxImportSource react */
// React previews for batch 1 (Skeleton, Skeleton reveal, Badge, Card, Avatar, Separator,
// Label, Spinner) and the React tiles on /react/docs/components. Each set mirrors its Vue twin
// (components/content/DemoStaticSet.vue, DemoSkeletonReveal.vue, DemoSpinner.vue,
// components/docs/ComponentTile.vue) so the two pages compare 1:1; keep them in sync.
import {
  GoopAvatar,
  GoopAvatarFallback,
  GoopAvatarImage,
  GoopBadge,
  GoopButton,
  GoopCard,
  GoopCardAction,
  GoopCardContent,
  GoopCardDescription,
  GoopCardFooter,
  GoopCardHeader,
  GoopCardTitle,
  GoopCheckbox,
  GoopLabel,
  GoopSeparator,
  GoopSkeleton,
  GoopSkeletonReveal,
  GoopSpinner,
  GoopSwitch,
} from '@goopui/react'
import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react'

type Pg = Record<string, Record<string, unknown>>

const portrait = (hue: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 22% 60%)"/><stop offset="1" stop-color="hsl(${hue + 30} 18% 34%)"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><circle cx="32" cy="26" r="11" fill="hsl(${hue} 15% 86%)"/><path d="M12 64c2-14 10-20 20-20s18 6 20 20z" fill="hsl(${hue} 15% 86%)"/></svg>`,
  )}`

/** shadcn/ui's Input (radix-nova classes): @goopui/react has no GoopInput yet. */
const INPUT =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30'
const Input = ({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) => <input className={`${INPUT} ${className}`} {...props} />

// ---- Skeleton, Badge, Card, Avatar, Separator, Label (DemoStaticSet.vue) --------------------

const people = [
  { name: 'Tim McMasters', initials: 'TM', src: portrait(30) },
  { name: 'Ada Lovelace', initials: 'AL', src: portrait(210) },
  { name: 'Grace Hopper', initials: 'GH', src: '' },
]

export function StaticSet({ set, pg }: { set: string; pg: Pg }) {
  const main = pg.main ?? {}
  switch (set) {
    case 'skeleton':
      return (
        <div className="grid w-full max-w-sm gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-4">
              <GoopSkeleton className="size-12 shrink-0 rounded-full" {...main} />
              <div className="grid flex-1 gap-2">
                <GoopSkeleton className="h-4 w-full" {...main} />
                <GoopSkeleton className="h-4 w-4/5" {...main} />
              </div>
            </div>
          ))}
        </div>
      )
    case 'skeleton-card':
      return (
        <div className="grid w-full max-w-xs gap-3">
          <GoopSkeleton className="h-32 w-full rounded-xl" />
          <GoopSkeleton className="h-4 w-3/4" />
          <GoopSkeleton className="h-4 w-1/2" />
        </div>
      )
    case 'skeleton-off':
      return (
        <div className="grid w-full max-w-xs gap-3">
          <GoopSkeleton className="h-4 w-full" preset="subtle" />
          <GoopSkeleton className="h-4 w-full" preset="wild" />
          <GoopSkeleton className="h-4 w-full" shimmer={false} />
        </div>
      )
    case 'badge':
      return (
        <div className="flex flex-wrap justify-center gap-3">
          <GoopBadge>Badge</GoopBadge>
          <GoopBadge variant="secondary">Secondary</GoopBadge>
          <GoopBadge variant="destructive">Destructive</GoopBadge>
          <GoopBadge variant="outline">Outline</GoopBadge>
          <GoopBadge variant="ghost">Ghost</GoopBadge>
          <GoopBadge variant="link">Link</GoopBadge>
        </div>
      )
    case 'badge-links':
      return (
        <div className="flex flex-wrap justify-center gap-3">
          <GoopBadge asChild {...main}>
            <a href="#usage">Link</a>
          </GoopBadge>
          <GoopBadge variant="secondary" asChild>
            <a href="#usage">Secondary</a>
          </GoopBadge>
          <GoopBadge variant="outline" asChild>
            <a href="#usage">Outline</a>
          </GoopBadge>
          <GoopBadge asChild swell={false}>
            <a href="#usage">No swell</a>
          </GoopBadge>
        </div>
      )
    case 'card':
    case 'card-goo': {
      const goo = set === 'card-goo'
      return (
        <GoopCard className="w-full max-w-sm" goo={goo} {...main}>
          <GoopCardHeader>
            <GoopCardTitle>Project Apollo</GoopCardTitle>
            <GoopCardDescription>Three tasks due this week.</GoopCardDescription>
            <GoopCardAction>
              <GoopBadge variant="outline">Live</GoopBadge>
            </GoopCardAction>
          </GoopCardHeader>
          <GoopCardContent className="text-sm text-muted-foreground">
            {goo || main.goo ? 'Move the pointer near an edge.' : 'A plain card: no goo unless you ask for it.'}
          </GoopCardContent>
          <GoopCardFooter className="gap-2">
            <GoopButton size="sm">Open</GoopButton>
            <GoopButton size="sm" variant="outline">
              Later
            </GoopButton>
          </GoopCardFooter>
        </GoopCard>
      )
    }
    case 'avatar':
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-3">
            {people.map((p) => (
              <GoopAvatar key={p.name} className="size-10" {...main}>
                <GoopAvatarImage src={p.src} alt={p.name} />
                <GoopAvatarFallback>{p.initials}</GoopAvatarFallback>
              </GoopAvatar>
            ))}
          </div>
        </div>
      )
    case 'separator':
      return (
        <div className="w-full max-w-xs text-sm">
          <div className="space-y-1">
            <h4 className="font-medium leading-none">goopUI</h4>
            <p className="text-muted-foreground">Components that drip.</p>
          </div>
          <GoopSeparator className="my-4" />
          <div className="flex h-5 items-center gap-4">
            <span>Blog</span>
            <GoopSeparator orientation="vertical" />
            <span>Docs</span>
            <GoopSeparator orientation="vertical" />
            <span>Source</span>
          </div>
        </div>
      )
    default:
      return (
        <div className="grid w-full max-w-xs gap-2">
          <GoopLabel htmlFor="demo-email">Email</GoopLabel>
          <Input id="demo-email" type="email" placeholder="you@example.com" />
        </div>
      )
  }
}

// ---- Skeleton reveal (DemoSkeletonReveal.vue) -----------------------------------------------

export function SkeletonRevealDemo({ pg }: { pg: Pg }) {
  const [loading, setLoading] = useState(true)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const reload = () => {
    clearTimeout(timer.current)
    setLoading(true)
    timer.current = setTimeout(() => setLoading(false), 1600)
  }
  useEffect(() => {
    reload()
    return () => clearTimeout(timer.current)
  }, [])

  const skeleton = (
    <>
      <div className="flex items-center gap-4">
        <GoopSkeleton className="size-12 shrink-0 rounded-full" />
        <div className="grid min-w-0 flex-1 gap-1">
          <div className="flex h-5 items-center">
            <GoopSkeleton className="h-4 w-32 max-w-full" />
          </div>
          <div className="flex h-5 items-center">
            <GoopSkeleton className="h-3.5 w-24 max-w-full" />
          </div>
        </div>
      </div>
      <div className="grid">
        <div className="flex h-5 items-center">
          <GoopSkeleton className="h-3.5 w-full" />
        </div>
        <div className="flex h-5 items-center">
          <GoopSkeleton className="h-3.5 w-4/5" />
        </div>
      </div>
      <GoopSkeleton className="h-8 w-28" />
    </>
  )

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <GoopCard className="w-full max-w-sm" data-shot="reveal-card">
        <GoopSkeletonReveal loading={loading} className="grid gap-4 px-(--card-spacing)" skeleton={skeleton} {...pg.main}>
          <div className="flex items-center gap-4">
            <GoopAvatar className="size-12">
              <GoopAvatarImage src={portrait(200)} alt="Ada Lovelace" />
              <GoopAvatarFallback>AL</GoopAvatarFallback>
            </GoopAvatar>
            <div className="grid min-w-0 flex-1 gap-1">
              <p className="m-0 truncate text-sm leading-5 font-semibold">Ada Lovelace</p>
              <p className="m-0 truncate text-sm leading-5 text-muted-foreground">@ada &middot; Analyst</p>
            </div>
          </div>
          <p className="m-0 line-clamp-2 h-10 text-sm leading-5 text-muted-foreground">
            Wrote the first published program, for a machine that was never built, and explained it better than its inventor.
          </p>
          <GoopButton className="w-28">Follow</GoopButton>
        </GoopSkeletonReveal>
      </GoopCard>
      <GoopButton variant="outline" size="sm" data-replay disabled={loading} onClick={reload}>
        Reload
      </GoopButton>
    </div>
  )
}

// ---- Spinner (DemoSpinner.vue) ----------------------------------------------------------------

const VARIANTS = ['orbit', 'comet', 'ring', 'dots', 'pulse'] as const

export function SpinnerDemo({ set, pg }: { set: string; pg: Pg }) {
  switch (set) {
    case 'playground':
      return <GoopSpinner className="size-12" {...pg.main} />
    case 'variants':
      return (
        <>
          {VARIANTS.map((v) => (
            <figure key={v} className="m-0 flex flex-col items-center gap-2">
              <GoopSpinner className="size-12" variant={v} />
              <figcaption className="font-mono text-xs text-muted-foreground">{v}</figcaption>
            </figure>
          ))}
        </>
      )
    case 'sizes':
      return (
        <>
          <GoopSpinner className="size-4" />
          <GoopSpinner className="size-6" />
          <GoopSpinner className="size-8" />
          <GoopSpinner className="size-12" />
          <GoopSpinner className="size-6 text-primary" />
          <GoopSpinner className="size-6 text-destructive" />
        </>
      )
    case 'button':
      return (
        <>
          <GoopButton disabled>
            <GoopSpinner data-icon="inline-start" />
            Saving
          </GoopButton>
          <GoopButton variant="outline" disabled>
            <GoopSpinner data-icon="inline-start" variant="comet" />
            Loading
          </GoopButton>
        </>
      )
    case 'options':
      return (
        <>
          <GoopSpinner className="size-12" blobs={6} />
          <GoopSpinner className="size-12" speed={2} />
          <GoopSpinner className="size-12" drips />
          <GoopSpinner className="size-12" preset="wild" />
          <GoopSpinner className="size-12" interactive={false} />
        </>
      )
    default:
      return <GoopSpinner className="size-10" />
  }
}

// ---- /react/docs/components tiles (ComponentTile.vue) ------------------------------------------

/** The Skeleton tile: a tiny profile card that loads, melts into its content, rests, and loads
 *  again (components/docs/SkeletonRevealTile.vue). */
function SkeletonRevealTile() {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let on = true
    let timer: ReturnType<typeof setTimeout>
    const cycle = () => {
      on = !on
      setLoading(on)
      timer = setTimeout(cycle, on ? 2000 : 2800)
    }
    timer = setTimeout(cycle, 1600)
    return () => clearTimeout(timer)
  }, [])
  const skeleton = (
    <>
      <div className="flex h-6 items-center gap-2">
        <GoopSkeleton className="size-6 shrink-0 rounded-full" />
        <div className="grid flex-1">
          <div className="flex h-3 items-center">
            <GoopSkeleton className="h-2 w-14" />
          </div>
          <div className="flex h-3 items-center">
            <GoopSkeleton className="h-1.5 w-10" />
          </div>
        </div>
      </div>
      <div className="flex h-3 items-center">
        <GoopSkeleton className="h-1.5 w-full" />
      </div>
      <GoopSkeleton className="h-5 w-12 rounded-sm" />
    </>
  )
  return (
    <GoopCard className="sk-card w-36 gap-0 py-2.5 ring-0">
      <GoopSkeletonReveal loading={loading} className="grid gap-2 px-3" skeleton={skeleton}>
        <div className="flex h-6 items-center gap-2">
          <GoopAvatar className="size-6">
            <GoopAvatarFallback className="text-[8px]">AL</GoopAvatarFallback>
          </GoopAvatar>
          <div className="grid min-w-0 flex-1">
            <p className="m-0 truncate text-[10px] leading-3 font-semibold">Ada Lovelace</p>
            <p className="m-0 truncate text-[8px] leading-3 text-muted-foreground">@ada</p>
          </div>
        </div>
        <p className="m-0 truncate text-[8px] leading-3 text-muted-foreground">First published program.</p>
        <span className="flex h-5 w-12 items-center justify-center rounded-sm bg-primary text-[8px] font-medium text-primary-foreground" data-goop-reveal>
          Follow
        </span>
      </GoopSkeletonReveal>
    </GoopCard>
  )
}

export function Tile({ slug }: { slug: string }) {
  switch (slug) {
    case 'button':
      return (
        <GoopButton size="sm" restingDrips={[0.3, 0.72]} interactive={false}>
          Button
        </GoopButton>
      )
    case 'switch':
      return <GoopSwitch defaultChecked aria-label="On" />
    case 'checkbox':
      return (
        <div className="flex items-center gap-2.5">
          <GoopCheckbox defaultChecked aria-label="Checked" />
          <GoopCheckbox aria-label="Unchecked" />
        </div>
      )
    case 'spinner':
      return <GoopSpinner className="size-9" />
    case 'skeleton':
      return <SkeletonRevealTile />
    case 'badge':
      return (
        <div className="flex items-center gap-1.5">
          <GoopBadge>New</GoopBadge>
          <GoopBadge variant="secondary">Beta</GoopBadge>
          <GoopBadge variant="outline">v1</GoopBadge>
        </div>
      )
    case 'card':
      return (
        <GoopCard className="sk-card w-36 gap-1.5 py-2.5 ring-0">
          <GoopCardHeader className="gap-0.5 px-3">
            <GoopCardTitle className="text-xs">Project Apollo</GoopCardTitle>
            <GoopCardDescription className="text-[10px]">Three tasks due</GoopCardDescription>
          </GoopCardHeader>
          <GoopCardContent className="flex gap-1 px-3 pt-1">
            <span className="sk-pill h-2.5 w-8 goo-fill" />
            <span className="sk-pill h-2.5 w-6" />
          </GoopCardContent>
        </GoopCard>
      )
    case 'avatar':
      return (
        <div className="flex -space-x-2">
          <GoopAvatar className="size-9 ring-2 ring-card">
            <GoopAvatarFallback className="bg-[color-mix(in_oklch,var(--foreground)_14%,transparent)] text-[11px] text-foreground">TM</GoopAvatarFallback>
          </GoopAvatar>
          <GoopAvatar className="size-9 ring-2 ring-card">
            <GoopAvatarFallback className="bg-[var(--goo)] text-[11px] text-[var(--goo-foreground)]">GU</GoopAvatarFallback>
          </GoopAvatar>
        </div>
      )
    case 'separator':
      return (
        <div className="w-32 text-[11px]">
          <span className="font-medium">goopUI</span>
          <GoopSeparator className="my-2" />
          <div className="flex h-3 items-center gap-2 text-muted-foreground">
            <span>Blog</span>
            <GoopSeparator orientation="vertical" />
            <span>Docs</span>
            <GoopSeparator orientation="vertical" />
            <span>Source</span>
          </div>
        </div>
      )
    case 'label':
      return (
        <div className="grid w-36 gap-1.5">
          <GoopLabel className="text-xs">Email</GoopLabel>
          <Input className="h-8 text-xs md:text-xs" placeholder="you@example.com" aria-label="Email" />
        </div>
      )
    default:
      return null
  }
}
