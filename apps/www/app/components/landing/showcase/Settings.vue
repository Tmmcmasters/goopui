<script setup lang="ts">
// A notification settings card: Switch, Slider, Toggle, ToggleGroup, Checkbox, RadioGroup,
// and a Collapsible "Advanced" section.
const uses = [
  { name: 'Switch', slug: 'switch' },
  { name: 'Slider', slug: 'slider' },
  { name: 'Toggle', slug: 'toggle', new: true },
  { name: 'ToggleGroup', slug: 'toggle-group' },
  { name: 'Checkbox', slug: 'checkbox' },
  { name: 'RadioGroup', slug: 'radio-group' },
  { name: 'Collapsible', slug: 'collapsible', new: true },
]

const muted = ref(false)
const push = ref(true)
const digest = ref(false)
const volume = ref([64])
const about = ref('mentions')
const email = ref(true)
const density = ref('cozy')
const quiet = ref(false)
const advanced = ref(false)
const id = useId()
</script>

<template>
  <LandingShowcaseTile :uses="uses">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h3 class="text-[15px] font-medium tracking-[-0.01em]">Notifications</h3>
        <p class="mt-0.5 text-sm text-muted-foreground">Choose what drips into your inbox.</p>
      </div>
      <GoopToggle v-model="muted" variant="outline" size="sm" aria-label="Mute all notifications">
        <SiteIcon name="bellOff" :size="15" />
        {{ muted ? 'Muted' : 'Mute' }}
      </GoopToggle>
    </div>

    <div class="mt-6 grid gap-5" :class="muted && 'opacity-50'">
      <div class="row">
        <label :for="`${id}-push`" class="min-w-0">
          <span class="block text-sm font-medium">Push notifications</span>
          <span class="block text-[13px] text-muted-foreground">To your phone, right away.</span>
        </label>
        <GoopSwitch :id="`${id}-push`" v-model="push" :disabled="muted" />
      </div>
      <div class="row">
        <label :for="`${id}-digest`" class="min-w-0">
          <span class="block text-sm font-medium">Weekly digest</span>
          <span class="block text-[13px] text-muted-foreground">One email on Monday mornings.</span>
        </label>
        <GoopSwitch :id="`${id}-digest`" v-model="digest" :disabled="muted" />
      </div>

      <div>
        <div class="flex items-baseline justify-between text-sm">
          <span :id="`${id}-vol`" class="font-medium">Volume</span>
          <span class="font-mono text-xs tabular-nums text-muted-foreground">{{ volume[0] }}%</span>
        </div>
        <GoopSlider v-model="volume" :max="100" :step="1" :aria-labelledby="`${id}-vol`" class="mt-3" :disabled="muted" />
      </div>

      <fieldset class="grid gap-2.5" :disabled="muted">
        <legend class="mb-2.5 text-sm font-medium">Notify me about</legend>
        <GoopRadioGroup v-model="about" class="gap-2.5" :disabled="muted">
          <label v-for="o in [['all', 'All new messages'], ['mentions', 'Direct messages and mentions'], ['none', 'Nothing']]" :key="o[0]" class="flex items-center gap-2.5 text-sm">
            <GoopRadioGroupItem :value="o[0]!" />
            {{ o[1] }}
          </label>
        </GoopRadioGroup>
      </fieldset>

      <label class="flex items-center gap-2.5 text-sm">
        <GoopCheckbox v-model="email" :disabled="muted" />
        Also send them by email
      </label>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <span :id="`${id}-density`" class="text-sm font-medium">Density</span>
        <GoopToggleGroup
          :model-value="density"
          type="single"
          variant="outline"
          size="sm"
          :aria-labelledby="`${id}-density`"
          @update:model-value="(v) => v && (density = v as string)"
        >
          <GoopToggleGroupItem value="compact">Compact</GoopToggleGroupItem>
          <GoopToggleGroupItem value="cozy">Cozy</GoopToggleGroupItem>
          <GoopToggleGroupItem value="roomy">Roomy</GoopToggleGroupItem>
        </GoopToggleGroup>
      </div>

      <GoopCollapsible v-model:open="advanced" class="-mx-1">
        <GoopCollapsibleTrigger class="adv-trigger">
          Advanced
          <SiteIcon name="chevronDown" :size="15" class="chev" :data-open="advanced || undefined" />
        </GoopCollapsibleTrigger>
        <GoopCollapsibleContent>
          <div class="px-1 pb-1 pt-3">
            <label class="flex items-center gap-2.5 text-sm">
              <GoopCheckbox v-model="quiet" />
              Quiet hours, 22:00 to 07:00
            </label>
          </div>
        </GoopCollapsibleContent>
      </GoopCollapsible>
    </div>
  </LandingShowcaseTile>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.adv-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  height: 2rem;
  padding: 0 0.625rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: color 150ms ease;
}
.adv-trigger:not([data-goop-flooded]) {
  color: var(--muted-foreground);
}
.adv-trigger:not([data-goop-flooded]):hover {
  color: var(--foreground);
}
.chev {
  transition: transform 220ms var(--ease-out-strong);
}
.chev[data-open] {
  transform: rotate(180deg);
}
fieldset {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
</style>
