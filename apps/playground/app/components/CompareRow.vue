<script setup lang="ts">
defineProps<{
  /** Variant or state name, e.g. `default`, `destructive`, `checked`. */
  label: string
  /** Optional one-line note shown under the label (e.g. how the goop variant is built). */
  note?: string
}>()

const goop = inject(compareGoopKey, computed(() => 'Goop'))
</script>

<template>
  <section class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] border-b last:border-b-0 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)]">
    <div class="col-span-2 px-4 pt-3 sm:col-span-1 sm:py-6">
      <h2 class="font-mono text-xs text-muted-foreground">
        {{ label }}
      </h2>
      <p v-if="note" class="mt-1 text-xs text-muted-foreground/80">
        {{ note }}
      </p>
    </div>
    <div class="flex min-h-24 flex-wrap items-center gap-3 px-4 py-6">
      <slot name="shadcn">
        <span class="text-sm text-muted-foreground">None</span>
      </slot>
    </div>
    <div class="flex min-h-24 flex-wrap items-center gap-3 border-l px-4 py-6">
      <slot name="goop">
        <div class="flex h-10 w-full items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
          {{ goop }} &middot; {{ label }}
        </div>
      </slot>
    </div>
  </section>
</template>
