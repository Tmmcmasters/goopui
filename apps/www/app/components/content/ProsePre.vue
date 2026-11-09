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
  <!-- The package-manager tabs are GoopTabs: the selected manager's pill is the goo blob. -->
  <GoopTabs
    v-if="commands"
    :model-value="manager"
    class="pm-tabs my-5 gap-0"
    @update:model-value="(v) => choose(v as Manager)"
  >
    <CodeFrame :code="commands[manager]" language="bash" class="!my-0">
      <template #tabs>
        <GoopTabsList aria-label="Package manager" class="-ml-2">
          <GoopTabsTrigger v-for="pm in MANAGERS" :key="pm" :value="pm" class="px-2 font-mono text-xs font-normal">
            {{ pm }}
          </GoopTabsTrigger>
        </GoopTabsList>
      </template>
      <GoopTabsContent v-for="pm in MANAGERS" :key="pm" :value="pm" as-child tabindex="-1">
        <pre class="pm-pre"><code><span class="text-muted-foreground select-none">$ </span>{{ commands[pm] }}</code></pre>
      </GoopTabsContent>
    </CodeFrame>
  </GoopTabs>
  <CodeFrame v-else :code="code ?? ''" :filename="filename ?? undefined" :language="language ?? undefined">
    <pre :class="$props.class"><slot /></pre>
  </CodeFrame>
</template>
