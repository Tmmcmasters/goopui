<script setup lang="ts">
import { toast } from 'vue-sonner'

// Overflow audit page (scripts/check-overflow.mjs): one component, pinned to a corner of a
// short page, in normal flow with no clipping ancestor. Goo that leaves the component must
// never grow the document's scroll size. `?c=<component>&at=br|bl|tr|tl`.
definePageMeta({ layout: false })
useHead({ title: 'edge' })

const route = useRoute()
const c = computed(() => String(route.query.c ?? 'button'))
const at = computed(() => String(route.query.at ?? 'br'))
const pos = computed(() => ({
  [at.value.includes('b') ? 'bottom' : 'top']: '8px',
  [at.value.includes('r') ? 'right' : 'left']: '8px',
}))

const checked = ref(false)
const on = ref(false)
const pressed = ref(false)
const fruit = ref<string>()
const slider = ref([50])
const progress = ref(30)
const radio = ref('a')
const text = ref('')
const TOASTER = 'edge'
const fire = () => toast('Event has been created', { toasterId: TOASTER, description: 'Sunday, December 03' })
</script>

<template>
  <div class="bg-background text-foreground">
    <div data-edge-box class="absolute flex items-end justify-end" :style="pos">
      <GoopButton v-if="c === 'button'" data-edge-target>
        Button
      </GoopButton>
      <GoopSpinner v-else-if="c === 'spinner'" data-edge-target class="size-12" />
      <GoopSwitch v-else-if="c === 'switch'" v-model="on" data-edge-target />
      <GoopCheckbox v-else-if="c === 'checkbox'" v-model="checked" data-edge-target />
      <GoopRadioGroup v-else-if="c === 'radio-group'" v-model="radio" orientation="horizontal" class="flex gap-4" data-edge-target>
        <GoopRadioGroupItem value="a" />
        <GoopRadioGroupItem value="b" />
      </GoopRadioGroup>
      <GoopPopover v-else-if="c === 'popover'">
        <GoopPopoverTrigger as-child>
          <GoopButton data-edge-target data-edge-open>
            Open popover
          </GoopButton>
        </GoopPopoverTrigger>
        <GoopPopoverContent>
          <GoopPopoverHeader>
            <GoopPopoverTitle>Dimensions</GoopPopoverTitle>
            <GoopPopoverDescription>Set the dimensions for the layer.</GoopPopoverDescription>
          </GoopPopoverHeader>
        </GoopPopoverContent>
      </GoopPopover>
      <GoopDropdownMenu v-else-if="c === 'dropdown'">
        <GoopDropdownMenuTrigger as-child>
          <GoopButton data-edge-target data-edge-open>
            Open menu
          </GoopButton>
        </GoopDropdownMenuTrigger>
        <GoopDropdownMenuContent class="w-48">
          <GoopDropdownMenuItem>Profile</GoopDropdownMenuItem>
          <GoopDropdownMenuItem>Settings</GoopDropdownMenuItem>
          <GoopDropdownMenuItem>Log out</GoopDropdownMenuItem>
        </GoopDropdownMenuContent>
      </GoopDropdownMenu>
      <GoopSelect v-else-if="c === 'select'" v-model="fruit">
        <GoopSelectTrigger class="w-44" data-edge-target data-edge-open>
          <GoopSelectValue placeholder="Select a fruit" />
        </GoopSelectTrigger>
        <GoopSelectContent>
          <GoopSelectItem v-for="f in ['apple', 'banana', 'cherry']" :key="f" :value="f">
            {{ f }}
          </GoopSelectItem>
        </GoopSelectContent>
      </GoopSelect>
      <GoopTabs v-else-if="c === 'tabs'" default-value="a">
        <GoopTabsList data-edge-target>
          <GoopTabsTrigger value="a">
            Account
          </GoopTabsTrigger>
          <GoopTabsTrigger value="b">
            Password
          </GoopTabsTrigger>
        </GoopTabsList>
      </GoopTabs>
      <GoopTooltipProvider v-else-if="c === 'tooltip'">
        <GoopTooltip>
          <GoopTooltipTrigger as-child>
            <GoopButton data-edge-target>
              Hover
            </GoopButton>
          </GoopTooltipTrigger>
          <GoopTooltipContent>Add to library</GoopTooltipContent>
        </GoopTooltip>
      </GoopTooltipProvider>
      <GoopSlider v-else-if="c === 'slider'" v-model="slider" :max="100" class="w-48" data-edge-target />
      <div v-else-if="c === 'progress'" class="w-48" data-edge-target @click="progress = progress > 60 ? 10 : 95">
        <GoopProgress :model-value="progress" class="w-full" />
      </div>
      <template v-else-if="c === 'toast'">
        <GoopButton data-edge-target data-edge-open @click="fire">
          Toast
        </GoopButton>
        <GoopToaster :id="TOASTER" position="bottom-right" />
      </template>
      <GoopDialog v-else-if="c === 'dialog'">
        <GoopDialogTrigger as-child>
          <GoopButton data-edge-target data-edge-open>
            Edit profile
          </GoopButton>
        </GoopDialogTrigger>
        <GoopDialogContent class="sm:max-w-[425px]">
          <GoopDialogHeader>
            <GoopDialogTitle>Edit profile</GoopDialogTitle>
            <GoopDialogDescription>Make changes here.</GoopDialogDescription>
          </GoopDialogHeader>
          <GoopDialogFooter>
            <GoopDialogClose as-child>
              <GoopButton variant="outline" data-edge-close>
                Cancel
              </GoopButton>
            </GoopDialogClose>
          </GoopDialogFooter>
        </GoopDialogContent>
      </GoopDialog>
      <GoopSheet v-else-if="c === 'sheet'">
        <GoopSheetTrigger as-child>
          <GoopButton data-edge-target data-edge-open>
            Open sheet
          </GoopButton>
        </GoopSheetTrigger>
        <GoopSheetContent side="right">
          <GoopSheetHeader>
            <GoopSheetTitle>Edit profile</GoopSheetTitle>
            <GoopSheetDescription>Make changes here.</GoopSheetDescription>
          </GoopSheetHeader>
          <GoopSheetFooter>
            <GoopSheetClose as-child>
              <GoopButton data-edge-close>
                Save
              </GoopButton>
            </GoopSheetClose>
          </GoopSheetFooter>
        </GoopSheetContent>
      </GoopSheet>
      <GoopDrawer v-else-if="c === 'drawer'">
        <GoopDrawerTrigger as-child>
          <GoopButton data-edge-target data-edge-open>
            Open drawer
          </GoopButton>
        </GoopDrawerTrigger>
        <GoopDrawerContent>
          <GoopDrawerHeader>
            <GoopDrawerTitle>Move goal</GoopDrawerTitle>
            <GoopDrawerDescription>Set your daily activity goal.</GoopDrawerDescription>
          </GoopDrawerHeader>
          <GoopDrawerFooter>
            <GoopDrawerClose as-child>
              <GoopButton variant="outline" data-edge-close>
                Cancel
              </GoopButton>
            </GoopDrawerClose>
          </GoopDrawerFooter>
        </GoopDrawerContent>
      </GoopDrawer>
      <GoopAccordion v-else-if="c === 'accordion'" type="single" collapsible class="w-72" data-edge-target>
        <GoopAccordionItem value="a">
          <GoopAccordionTrigger>Is it accessible?</GoopAccordionTrigger>
          <GoopAccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</GoopAccordionContent>
        </GoopAccordionItem>
        <GoopAccordionItem value="b">
          <GoopAccordionTrigger>Is it styled?</GoopAccordionTrigger>
          <GoopAccordionContent>Yes. It comes with default styles.</GoopAccordionContent>
        </GoopAccordionItem>
      </GoopAccordion>
      <GoopInput v-else-if="c === 'input'" v-model="text" placeholder="Email" class="w-56" data-edge-target />
      <GoopToggle v-else-if="c === 'toggle'" v-model="pressed" aria-label="Toggle bold" data-edge-target>
        B
      </GoopToggle>
    </div>
  </div>
</template>
