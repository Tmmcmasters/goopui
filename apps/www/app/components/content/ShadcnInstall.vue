<script setup lang="ts">
// "shadcn CLI" install option on a component page: the registry item that holds this
// component (by docs slug, or by the component's export, e.g. toaster -> sonner), as a
// `shadcn add <url>` / `shadcn-vue add <url>` command with package-manager tabs. Placed at the
// end of the page's Installation section by components/docs/Page.vue, so every component page
// gets it without markdown edits. Renders nothing when this framework has no item yet.
import { registryItems } from '#build/goop-registry.mjs'
import { componentDoc } from '~/component-docs/registry'

const props = defineProps<{ slug: string }>()
const { fw, to } = useFramework()

const REGISTRY = 'https://goop.timmcmasters.work/r'

const item = computed(() => {
  const items = registryItems[fw.value] ?? {}
  if (items[props.slug]) return props.slug
  const component = componentDoc(props.slug)?.component
  return component ? Object.keys(items).find((name) => items[name]!.includes(component)) : undefined
})
const cli = computed(() => (fw.value === 'react' ? 'shadcn' : 'shadcn-vue'))
const command = computed(() => `pnpm dlx ${cli.value}@latest add ${REGISTRY}/${fw.value}/${item.value}.json`)
</script>

<template>
  <section v-if="item" class="shadcn-install">
    <h3 id="shadcn-cli">shadcn CLI</h3>
    <p>
      Or own the source: the {{ fw === 'react' ? 'shadcn' : 'shadcn-vue' }} CLI copies this component into
      <code>components/ui/goop-{{ item }}/</code>, with the shared goopUI lib (<code>lib/goop/</code>) and the goo styles in your
      CSS file. The engine, <code>@goopui/core</code>, still comes from npm.
      <NuxtLink :to="to('/docs/getting-started/shadcn-cli')">Install with the shadcn CLI</NuxtLink> explains both paths.
    </p>
    <ProsePre :code="command" language="bash" />
  </section>
</template>
