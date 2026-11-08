<script setup lang="ts">
// GoopNavigationMenu: shadcn-vue's NavigationMenu root (reka-ui NavigationMenuRoot, same
// props/emits/slot, `viewport` prop, `class` merge) carrying the goo props for every part:
//   - the top-level items' hover / focus / open background is ONE goo blob that flows between
//     them with momentum (GoopNavigationMenuList, core `attachNavigationMenuHighlight`); the
//     links inside a panel get the same blob (`contentHighlight`);
//   - the viewport blooms out of the active trigger, and moving to another trigger slides and
//     resizes it as one goo body with a gentle jelly settle, not a re-open
//     (GoopNavigationMenuViewport, core `attachNavigationMenuViewport`). With `:viewport="false"`
//     each panel blooms from its own trigger.
// Toggles: `highlight`, `contentHighlight`, `bloom`, `jelly`, `wobble`, `momentum`, plus the
// bloom's `fade` / `openSlosh` / `openDrips` / `closeSlosh`; `:goo="false"` is plain shadcn.
// Reduced motion: static goo (the blob and panel snap). Browser-only goo: SSR renders shadcn.
import { cn } from 'cn'
import type { NavigationMenuRootEmits, NavigationMenuRootProps } from 'reka-ui'
import { NavigationMenuRoot, useForwardPropsEmits } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { NAVIGATION_MENU_PROP_KEYS, toNavigationMenuOptions, type GoopNavigationMenuProps, type GoopSoundProps } from '../../goop-props'
import { useGoopSound } from '../../sound'
import { provideGoopNavigationMenu } from './context'
import GoopNavigationMenuViewport from './GoopNavigationMenuViewport.vue'

const props = withDefaults(
  defineProps<
    NavigationMenuRootProps &
      GoopNavigationMenuProps &
      GoopSoundProps & {
        class?: HTMLAttributes['class']
        viewport?: boolean
      }
  >(),
  {
    viewport: true,
    goo: undefined,
    highlight: undefined,
    contentHighlight: undefined,
    bloom: undefined,
    jelly: undefined,
    wobble: undefined,
    momentum: undefined,
    fade: undefined,
    openSlosh: undefined,
    openDrips: undefined,
    closeSlosh: undefined,
    openDripAmount: undefined,
    openDripSize: undefined,
    openDripFling: undefined,
    openDripVariety: undefined,
    sloshVariety: undefined,
    surface: undefined,
    speed: undefined,
    preset: undefined,
    renderer: undefined,
    sound: undefined,
  },
)
const emits = defineEmits<NavigationMenuRootEmits>()

const OWN = new Set<string>(['class', 'viewport', 'sound', ...NAVIGATION_MENU_PROP_KEYS])
const delegated = computed(() => Object.fromEntries(Object.entries(props).filter(([k]) => !OWN.has(k))) as NavigationMenuRootProps)
const forwarded = useForwardPropsEmits(delegated, emits)

const config = useGoopConfig()
const goo = computed(() => toNavigationMenuOptions(props, config))
provideGoopNavigationMenu({ goo, viewport: computed(() => props.viewport) })
useGoopSound(() => props.sound)
</script>

<template>
  <NavigationMenuRoot
    v-slot="slotProps"
    data-slot="navigation-menu"
    :data-viewport="viewport"
    v-bind="forwarded"
    :class="cn('group/navigation-menu relative flex max-w-max flex-1 items-center justify-center', props.class)"
  >
    <slot v-bind="slotProps" />
    <GoopNavigationMenuViewport v-if="viewport" />
  </NavigationMenuRoot>
</template>
