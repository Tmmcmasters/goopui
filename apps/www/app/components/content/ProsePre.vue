<script setup lang="ts">
// Docs code blocks: Shiki output (dual light/dark themes) inside the shared CodeFrame,
// with a filename bar when the fence has one (```ts [nuxt.config.ts]) and a copy button.
// A block made only of `pnpm add|up|dlx` lines gets pnpm / npm / yarn / bun tabs instead;
// the choice is shared by every block and remembered (localStorage `goop-pm`).
const props = defineProps<{
  code?: string
  language?: string | null
  filename?: string | null
  highlights?: number[]
  meta?: string | null
  class?: string | null
}>()

const MANAGERS = ['pnpm', 'npm', 'yarn', 'bun'] as const
type Manager = (typeof MANAGERS)[number]

function convert(line: string, pm: Manager): string | null {
  const m = /^pnpm\s+(add|up|dlx)\b(.*)$/.exec(line.trim())
  if (!m) return null
  const [, cmd, rest = ''] = m
  if (pm === 'pnpm') return line.trim()
  if (cmd === 'dlx') return { npm: 'npx', yarn: 'yarn dlx', bun: 'bunx' }[pm] + rest
  if (cmd === 'up') return { npm: 'npm update', yarn: 'yarn up', bun: 'bun update' }[pm] + rest
  // add: dev flag spellings differ (bun uses -d / --dev)
  const args = pm === 'bun' ? rest.replace(/(^|\s)(-D|--save-dev)(?=\s|$)/g, '$1-d') : rest
  return (pm === 'npm' ? 'npm install' : `${pm} add`) + args
}

const commands = computed<Record<Manager, string> | null>(() => {
  const lines = (props.code ?? '').trim().split('\n').filter(l => l.trim())
  if (!lines.length || !lines.every(l => convert(l, 'pnpm'))) return null
  return Object.fromEntries(MANAGERS.map(pm => [pm, lines.map(l => convert(l, pm)).join('\n')])) as Record<Manager, string>
})

// SSR and first client render use pnpm; the stored choice applies after mount (no mismatch).
const manager = useState<Manager>('goop-pm', () => 'pnpm')
onMounted(() => {
  if (!commands.value) return
  try {
    const stored = localStorage.getItem('goop-pm') as Manager | null
    if (stored && MANAGERS.includes(stored)) manager.value = stored
  } catch {}
})
function choose(pm: Manager) {
  manager.value = pm
  try { localStorage.setItem('goop-pm', pm) } catch {}
}
</script>

<template>
  <CodeFrame v-if="commands" :code="commands[manager]" language="bash">
    <template #tabs>
      <div class="-ml-1 flex h-full items-stretch gap-0.5" role="group" aria-label="Package manager">
        <button
          v-for="pm in MANAGERS"
          :key="pm"
          type="button"
          class="pm-tab relative px-2 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          :class="pm === manager ? 'text-foreground' : ''"
          :aria-pressed="pm === manager"
          @click="choose(pm)"
        >
          {{ pm }}
        </button>
      </div>
    </template>
    <pre class="pm-pre"><code><span class="text-muted-foreground select-none">$ </span>{{ commands[manager] }}</code></pre>
  </CodeFrame>
  <CodeFrame v-else :code="code ?? ''" :filename="filename ?? undefined" :language="language ?? undefined">
    <pre :class="$props.class"><slot /></pre>
  </CodeFrame>
</template>

<style scoped>
.pm-tab[aria-pressed='true']::after {
  content: '';
  position: absolute;
  inset-inline: 0.5rem;
  bottom: -1px;
  height: 2px;
  border-radius: 1px;
  background: var(--goo, currentColor);
}
</style>
