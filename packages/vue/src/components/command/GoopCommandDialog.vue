<script setup lang="ts">
// GoopCommandDialog: shadcn-vue's CommandDialog (a Dialog with a screen-reader title and
// description around a Command; same root props/emits). The panel blooms open like
// GoopDialogContent (pools from its center, overshoots and splashes all around; close pulls
// in and shrinks back), and the command inside gets the goo highlight and input ring. The
// dialog's bloom props and the command's toggles are both props here; `goo`, `wobble`,
// `speed`, `preset` and `renderer` drive both. With `:goo="false"` it is shadcn's CommandDialog.
import type { DialogRootEmits, DialogRootProps } from 'reka-ui'
import { useForwardPropsEmits } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { COMMAND_DIALOG_PROP_KEYS, DIALOG_PROP_KEYS, type GoopCommandDialogProps } from '../../goop-props'
import GoopDialog from '../dialog/GoopDialog.vue'
import GoopDialogContent from '../dialog/GoopDialogContent.vue'
import GoopDialogDescription from '../dialog/GoopDialogDescription.vue'
import GoopDialogHeader from '../dialog/GoopDialogHeader.vue'
import GoopDialogTitle from '../dialog/GoopDialogTitle.vue'
import GoopCommand from './GoopCommand.vue'

const props = withDefaults(
  defineProps<
    DialogRootProps &
      GoopCommandDialogProps & {
        title?: string
        description?: string
        class?: HTMLAttributes['class']
        showCloseButton?: boolean
      }
  >(),
  {
    title: 'Command Palette',
    description: 'Search for a command to run...',
    showCloseButton: false,
    open: undefined,
    defaultOpen: undefined,
    modal: undefined,
    goo: undefined,
    bloomStart: undefined,
    wobble: undefined,
    fade: undefined,
    openSlosh: undefined,
    openDrips: undefined,
    closeSlosh: undefined,
    openDripAmount: undefined,
    openDripSize: undefined,
    openDripFling: undefined,
    openDripVariety: undefined,
    sloshVariety: undefined,
    overlay: undefined,
    overlayDrips: undefined,
    surface: undefined,
    highlight: undefined,
    pop: undefined,
    ring: undefined,
    momentum: undefined,
    followPointer: undefined,
    speed: undefined,
    preset: undefined,
    renderer: undefined,
  },
)
const emits = defineEmits<DialogRootEmits>()

const OWN = new Set<string>(['class', 'title', 'description', 'showCloseButton', ...COMMAND_DIALOG_PROP_KEYS])
const delegated = computed(() => Object.fromEntries(Object.entries(props).filter(([k]) => !OWN.has(k))) as DialogRootProps)
const forwarded = useForwardPropsEmits(delegated, emits)

const pick = (keys: readonly string[]) =>
  Object.fromEntries(keys.map((k) => [k, (props as Record<string, unknown>)[k]]).filter(([, v]) => v !== undefined))
const dialogGoo = computed(() => ({ ...pick(DIALOG_PROP_KEYS), goo: props.goo !== false }))
const commandGoo = computed(() =>
  pick(['goo', 'highlight', 'pop', 'ring', 'wobble', 'momentum', 'followPointer', 'speed', 'preset', 'renderer']),
)
</script>

<template>
  <GoopDialog
    v-slot="slotProps"
    v-bind="forwarded"
  >
    <GoopDialogContent
      v-bind="dialogGoo"
      :show-close-button="showCloseButton"
      class="top-1/3 gap-0 overflow-visible rounded-xl p-0 sm:max-w-lg"
    >
      <GoopDialogHeader class="sr-only">
        <GoopDialogTitle>{{ title }}</GoopDialogTitle>
        <GoopDialogDescription>{{ description }}</GoopDialogDescription>
      </GoopDialogHeader>
      <GoopCommand
        v-bind="commandGoo"
        :class="['rounded-[inherit] bg-transparent', props.class]"
      >
        <slot v-bind="slotProps" />
      </GoopCommand>
    </GoopDialogContent>
  </GoopDialog>
</template>
