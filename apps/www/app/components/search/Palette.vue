<script setup lang="ts">
// The header's "Search docs… ⌘K" bar and its palette: a GoopCommandDialog over every docs
// page and heading (Nuxt Content's search sections), grouped by top-level section, plus site
// actions (theme, sound, reduced motion, GitHub, copy the install command).
// - Opens from the bar (an icon button on narrow screens), ⌘K / Ctrl+K anywhere, or "/" when
//   not typing in a field.
// - The index loads on first open and stays cached for the visit.
// - Focus goes back to the trigger on close (reka's dialog restores focus to whatever was
//   focused when it opened, so keyboard opens focus the visible trigger first).
// - The palette ranks and filters its own results (utils/search.ts: fuzzy titles, body-text
//   snippets), so the command's built-in "contains" filter is off (`ignore-filter`).
import { scoreAction, searchDocs, type SearchHit, type SearchSection } from '~/utils/search'

// `wide`: room for the full bar from `sm` up (the landing's header has one nav link);
// otherwise the bar shows from `md` and narrower screens get the icon button.
const props = defineProps<{ wide?: boolean }>()

const GITHUB = GITHUB_URL
const { label: starsLabel } = useGithubStars()
// The first command on the installation page (pnpm, the Nuxt module).
// Results link into the current framework's docs (/docs or /react/docs).
const { to, isReact, counterpart, setPreferred } = useFramework()
const install = computed(() => (isReact.value ? 'pnpm add @goopui/react' : 'pnpm add @goopui/nuxt'))

const open = ref(false)
const query = ref('')
const bar = useTemplateRef<HTMLButtonElement>('bar')
const icon = useTemplateRef<HTMLButtonElement>('icon')

// Platform-specific hint, set after hydration (the server can't know it).
const isMac = ref(true)
onMounted(() => {
  isMac.value = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)
})

// ---- Index: fetched once, on first open ------------------------------------------------
const sections = shallowRef<SearchSection[] | null>(null)
const failed = ref(false)
let loading: Promise<void> | null = null
function loadIndex() {
  if (sections.value || loading) return
  failed.value = false
  loading = queryCollectionSearchSections('docs', { ignoredTags: ['style', 'script'] })
    .then((s) => {
      sections.value = s as SearchSection[]
    })
    .catch((err) => {
      console.error('[search] could not load the docs index', err)
      failed.value = true
    })
    .finally(() => {
      loading = null
    })
}
watch(open, (o) => {
  if (o) loadIndex()
  else query.value = ''
})

const groups = computed(() => (sections.value ? searchDocs(sections.value, query.value) : []))

// ---- Actions -----------------------------------------------------------------------------
const { isDark, toggle: toggleTheme } = useTheme()
const { enabled: soundOn, setEnabled: setSound } = useSoundPreference()
const { forced, osReduced, setForced } = useMotionPreference()
const copied = ref(false)

interface Action {
  id: string
  label: string
  keywords: string
  icon: 'sun' | 'moon' | 'volume' | 'volumeOff' | 'pause' | 'drop' | 'github' | 'copy' | 'check' | 'code'
  hint?: string
  disabled?: boolean
  run: () => void | Promise<void>
}

const actions = computed<Action[]>(() => [
  {
    id: 'theme',
    label: isDark.value ? 'Switch to light theme' : 'Switch to dark theme',
    keywords: 'theme dark light mode appearance color',
    icon: isDark.value ? 'sun' : 'moon',
    run: () => {
      toggleTheme()
      close()
    },
  },
  {
    id: 'sound',
    label: soundOn.value ? 'Mute sounds' : 'Turn sounds on',
    keywords: 'sound audio mute unmute volume',
    icon: soundOn.value ? 'volumeOff' : 'volume',
    run: () => {
      setSound(!soundOn.value)
      close()
    },
  },
  {
    id: 'motion',
    label: osReduced.value
      ? 'Reduced motion is on (system setting)'
      : forced.value
        ? 'Allow motion'
        : 'Reduce motion',
    keywords: 'reduce reduced motion animation accessibility',
    icon: forced.value || osReduced.value ? 'drop' : 'pause',
    disabled: osReduced.value,
    run: () => {
      setForced(!forced.value)
      close()
    },
  },
  {
    id: 'framework',
    label: isReact.value ? 'Switch to the Vue docs' : 'Switch to the React docs',
    keywords: 'framework react vue nuxt next switch docs',
    icon: 'code',
    run: () => {
      const target = isReact.value ? 'vue' : 'react'
      setPreferred(target)
      close()
      navigateTo(counterpart(target) ?? docsPathFor('/docs/getting-started/introduction', target))
    },
  },
  {
    id: 'github',
    label: 'Open GitHub',
    keywords: 'github repository source code issues',
    icon: 'github',
    hint: starsLabel.value === null ? undefined : `${starsLabel.value} stars`,
    run: () => {
      window.open(GITHUB, '_blank', 'noopener')
      close()
    },
  },
  {
    id: 'install',
    label: copied.value ? 'Copied install command' : 'Copy install command',
    keywords: `install copy pnpm npm add ${install.value}`,
    icon: copied.value ? 'check' : 'copy',
    hint: install.value,
    run: async () => {
      try {
        await navigator.clipboard.writeText(install.value)
        copied.value = true
        // Let the check mark show for a beat before the palette closes.
        setTimeout(() => {
          close()
          copied.value = false
        }, 650)
      } catch {
        close()
      }
    },
  },
])

const shownActions = computed(() =>
  actions.value
    .map((a) => ({ a, score: scoreAction(a.label, a.keywords, query.value) }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .map((x) => x.a),
)

const ready = computed(() => !!sections.value)
const nothing = computed(() => ready.value && !!query.value.trim() && !groups.value.length && !shownActions.value.length)

// ---- Open / close / navigate ---------------------------------------------------------------
function visibleTrigger(): HTMLButtonElement | null {
  for (const el of [bar.value, icon.value]) if (el && el.offsetParent !== null) return el
  return null
}
function show() {
  // Focus the trigger first so the dialog hands focus back to it on close.
  visibleTrigger()?.focus({ preventScroll: true })
  open.value = true
}
function close() {
  open.value = false
}

function go(hit: SearchHit) {
  close()
  navigateTo(to(hit.section.id))
}

function isTyping(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  return t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)
}
function onKey(e: KeyboardEvent) {
  if (e.defaultPrevented || e.isComposing) return
  if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    if (open.value) close()
    else show()
  } else if (e.key === '/' && !open.value && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
    e.preventDefault()
    show()
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

const shortcut = computed(() => (isMac.value ? '⌘K' : 'Ctrl K'))
const shortcutAria = 'Meta+K Control+K /'
</script>

<template>
  <button
    ref="bar"
    type="button"
    class="search-bar hidden h-9 w-52 items-center gap-2 rounded-lg border pl-2.5 pr-1.5 text-sm lg:w-60"
    :class="props.wide ? 'sm:flex' : 'md:flex'"
    aria-haspopup="dialog"
    :aria-expanded="open"
    :aria-keyshortcuts="shortcutAria"
    aria-label="Search docs"
    @click="show"
  >
    <SiteIcon name="search" :size="15" />
    <span class="flex-1 truncate text-left">Search docs…</span>
    <kbd class="search-kbd" aria-hidden="true">{{ shortcut }}</kbd>
  </button>
  <button
    ref="icon"
    type="button"
    class="search-icon grid size-9 place-items-center rounded-lg text-muted-foreground"
    :class="props.wide ? 'sm:hidden' : 'md:hidden'"
    aria-haspopup="dialog"
    :aria-expanded="open"
    :aria-keyshortcuts="shortcutAria"
    aria-label="Search docs"
    title="Search docs"
    @click="show"
  >
    <SiteIcon name="search" :size="17" />
  </button>

  <GoopCommandDialog
    v-model:open="open"
    title="Search docs"
    description="Search the goopUI docs, or run an action like switching the theme."
    class="search-palette"
    ignore-filter
  >
    <GoopCommandInput v-model="query" placeholder="Search docs…" auto-focus aria-label="Search docs" />
    <!-- The dialog centres a third of the way down; this height keeps its top edge below the
         header (top = 33dvh - height / 2 >= header + 12px). -->
    <GoopCommandList class="max-h-[clamp(160px,calc(66dvh-232px),420px)]" data-lenis-prevent>
      <p v-if="!ready && !failed" class="search-note" role="status">Loading the docs index…</p>
      <p v-else-if="failed" class="search-note" role="status">
        Couldn't load the search index.
        <button type="button" class="underline underline-offset-2" @click="loadIndex">Try again</button>
      </p>
      <p v-else-if="nothing" class="search-note" role="status">No results for “{{ query.trim() }}”.</p>

      <GoopCommandGroup v-for="g in groups" :key="g.label" :heading="g.label">
        <GoopCommandItem
          v-for="h in g.hits"
          :key="h.section.id"
          :value="h.section.id"
          class="search-item"
          @select="go(h)"
        >
          <SiteIcon :name="h.crumbs.length > 1 ? 'hash' : 'file'" :size="15" />
          <span class="min-w-0 flex-1">
            <span class="block truncate">
              <template v-for="(c, i) in h.crumbs" :key="i">
                <span v-if="i > 0" class="crumb-sep" aria-hidden="true"> › </span>
                <span :class="i < h.crumbs.length - 1 ? 'text-muted-foreground' : undefined">{{ c }}</span>
              </template>
            </span>
            <span v-if="h.snippet" class="block truncate text-xs text-muted-foreground">{{ h.snippet }}</span>
          </span>
        </GoopCommandItem>
      </GoopCommandGroup>

      <GoopCommandGroup v-if="ready && shownActions.length" heading="Actions">
        <GoopCommandItem
          v-for="a in shownActions"
          :key="a.id"
          :value="`action:${a.id}`"
          :disabled="a.disabled"
          class="search-item"
          @select="a.run()"
        >
          <SiteIcon :name="a.icon" :size="15" />
          <span class="min-w-0 flex-1 truncate">{{ a.label }}</span>
          <GoopCommandShortcut v-if="a.hint" class="hidden truncate font-mono tracking-normal sm:inline">
            {{ a.hint }}
          </GoopCommandShortcut>
        </GoopCommandItem>
      </GoopCommandGroup>
    </GoopCommandList>
    <div class="search-foot" aria-hidden="true">
      <span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span>
      <span><kbd>↵</kbd> to open</span>
      <span><kbd>esc</kbd> to close</span>
    </div>
    <span class="sr-only" aria-live="polite">{{ copied ? 'Install command copied to clipboard' : '' }}</span>
  </GoopCommandDialog>
</template>

<style scoped>
.search-bar {
  border-color: var(--border);
  background: color-mix(in oklch, var(--muted) 55%, transparent);
  color: var(--muted-foreground);
  transition:
    color 150ms ease,
    background-color 150ms ease,
    border-color 150ms ease;
}
.search-bar:hover {
  color: var(--foreground);
  background: var(--muted);
  border-color: var(--border-strong);
}
.search-kbd {
  display: inline-flex;
  height: 1.375rem;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  background: var(--background);
  padding: 0 0.375rem;
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1;
  color: var(--muted-foreground);
}
.search-icon {
  transition:
    color 150ms ease,
    background-color 150ms ease;
}
.search-icon:hover {
  color: var(--foreground);
  background: var(--muted);
}
.search-note {
  padding: 1.5rem 0.5rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--muted-foreground);
}
.crumb-sep {
  color: var(--subtle);
}
.search-foot {
  display: none;
  gap: 1rem;
  border-top: 1px solid var(--border);
  margin: 0.25rem -0.25rem -0.25rem;
  padding: 0.5rem 0.875rem;
  font-size: 11px;
  color: var(--subtle);
}
.search-foot kbd {
  margin-right: 0.25rem;
  font-family: var(--font-mono);
  color: var(--muted-foreground);
}
@media (min-width: 640px) {
  .search-foot {
    display: flex;
  }
}
</style>
