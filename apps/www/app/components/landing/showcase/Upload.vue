<script setup lang="ts">
// An upload row: Progress fills while a fake file "uploads".
const uses = [{ name: 'Progress', slug: 'progress' }]

const SIZE = 4.2
const value = ref(38)
const running = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

function stop() {
  clearInterval(timer)
  timer = undefined
  running.value = false
}
function start() {
  if (value.value >= 100) value.value = 0
  running.value = true
  clearInterval(timer)
  timer = setInterval(() => {
    // Uneven chunks, like a real network.
    value.value = Math.min(100, value.value + 3 + Math.random() * 9)
    if (value.value >= 100) stop()
  }, 260)
}
onUnmounted(stop)

const done = computed(() => value.value >= 100)
const pct = computed(() => Math.round(value.value))
</script>

<template>
  <LandingShowcaseTile :uses="uses">
    <div class="flex items-center gap-3">
      <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
        <SiteIcon name="file" :size="18" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium">brand-kit.zip</p>
        <p class="text-[13px] tabular-nums text-muted-foreground" aria-live="polite">
          {{ done ? `${SIZE} MB · Uploaded` : `${((SIZE * value) / 100).toFixed(1)} of ${SIZE} MB${running ? '' : ' · Paused'}` }}
        </p>
      </div>
      <span class="font-mono text-xs tabular-nums text-muted-foreground">{{ pct }}%</span>
    </div>
    <GoopProgress :model-value="value" class="mt-4" aria-label="Upload progress" />
    <div class="mt-5 flex items-center gap-3 border-t border-border pt-4">
      <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
        <SiteIcon name="file" :size="18" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium">logo-puddle.svg</p>
        <p class="text-[13px] text-muted-foreground">12 KB · Uploaded</p>
      </div>
      <SiteIcon name="check" :size="16" class="text-goo-ink" />
    </div>
    <div class="mt-5 flex gap-2">
      <GoopButton size="sm" @click="running ? stop() : start()">
        <SiteIcon name="upload" :size="14" data-icon="inline-start" />
        {{ running ? 'Pause' : done ? 'Upload again' : 'Resume upload' }}
      </GoopButton>
      <GoopButton size="sm" variant="ghost" :disabled="value === 0" @click="(stop(), (value = 0))">Reset</GoopButton>
    </div>
  </LandingShowcaseTile>
</template>
