<script setup lang="ts">
// A live @goopui/react demo inside the (Vue) docs site: a real React root, mounted with
// react-dom's createRoot on the client. The server renders this same empty `display:
// contents` box (so hydration matches) inside a fixed-min-height preview frame, so nothing
// shifts when React paints. Props (the demo set, the playground's Customize choices, the
// stage's Slow-mo / Let it fly) re-render the root; it unmounts with the component.
import type { Root } from 'react-dom/client'
import type { ReactDemoProps } from '~/react-demos'

const props = defineProps<{
  demo: string
  set?: string
  /** Customize choices per part ('main', 'list', 'content'). */
  pg?: Record<string, Record<string, unknown>>
  /** The Preview frame's stage, for GoopButton demos. */
  stage?: GoopStage
}>()

const el = useTemplateRef<HTMLElement>('el')
const { to } = useFramework()
let root: Root | null = null
let paint: (() => void) | null = null
let gone = false

onMounted(async () => {
  const [React, ReactDOM, client, demos] = await Promise.all([import('react'), import('react-dom'), import('react-dom/client'), import('~/react-demos')])
  if (gone || !el.value) return
  const r = client.createRoot(el.value)
  root = r
  paint = () => {
    const p: ReactDemoProps = {
      demo: props.demo,
      set: props.set ?? '',
      // Plain copies: React shouldn't hold Vue proxies.
      pg: JSON.parse(JSON.stringify(props.pg ?? {})),
      stage: props.stage ? { props: { ...props.stage.props.value }, register: props.stage.register } : undefined,
      to,
      navigate: (path) => void navigateTo(path),
    }
    r.render(React.createElement(demos.ReactDemo, p))
  }
  // Paint synchronously, so a replay that clicks the new demo's trigger right after a remount
  // finds it.
  ReactDOM.flushSync(paint)
})

watch(() => [props.set, props.pg, props.stage?.props.value], () => paint?.(), { deep: true })

onBeforeUnmount(() => {
  gone = true
  root?.unmount()
  root = null
})
</script>

<template>
  <div ref="el" class="contents" data-react-island :data-demo="demo" />
</template>
