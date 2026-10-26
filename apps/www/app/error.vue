<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const notFound = computed(() => props.error.statusCode === 404)
useSeoMeta({ title: () => (notFound.value ? 'Page not found' : 'Something broke') })
</script>

<template>
  <NuxtLayout name="default">
    <section class="mx-auto grid min-h-[70dvh] max-w-6xl place-items-center px-4 pt-[var(--header-h)] sm:px-6">
      <div class="flex flex-col items-center text-center">
        <GoopHost class="err-blob" aria-hidden="true" :options="{ interactive: false, drips: false, restingDrips: 3, dripSize: 8, dripLength: 22 }" />
        <p class="mt-14 font-mono text-xs uppercase tracking-[0.12em] text-subtle">{{ error.statusCode }}</p>
        <h1 class="type-display mt-3 text-4xl">
          {{ notFound ? 'This page dripped away.' : 'Something went sideways.' }}
        </h1>
        <p class="mt-3 max-w-sm text-muted-foreground">
          {{ notFound ? "There's nothing at this address." : error.statusMessage }}
        </p>
        <div class="mt-8 flex gap-3">
          <button type="button" class="goop-btn" @click="clearError({ redirect: '/' })">Home</button>
          <button type="button" class="goop-btn" data-variant="secondary" @click="clearError({ redirect: '/docs/getting-started/introduction' })">
            Docs
          </button>
        </div>
      </div>
    </section>
  </NuxtLayout>
</template>

<style scoped>
.err-blob {
  width: 84px;
  height: 56px;
  border-radius: 999px;
  --goop-color: var(--goo);
}
.goop-btn {
  background: var(--primary);
}
.goop-btn[data-variant='secondary'] {
  background: var(--secondary);
}
</style>
