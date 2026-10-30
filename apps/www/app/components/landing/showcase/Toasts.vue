<script setup lang="ts">
// A message row whose actions fire toasts into the page's GoopToaster.
import { toast } from 'vue-sonner'

const uses = [
  { name: 'Toaster', slug: 'toaster' },
  { name: 'Button', slug: 'button' },
]

const archived = ref(false)
function archive() {
  archived.value = true
  toast('Message archived', {
    description: 'Moved out of your inbox.',
    action: { label: 'Undo', onClick: () => (archived.value = false) },
  })
}
const pinned = ref(false)
function pin() {
  pinned.value = !pinned.value
  toast(pinned.value ? 'Pinned to the top' : 'Unpinned')
}
const star = () => toast.success('Starred. You’ll find it under Favourites.')
</script>

<template>
  <LandingShowcaseTile :uses="uses">
    <div class="flex items-start gap-3" :class="archived && 'opacity-50'">
      <span class="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-sm font-medium" aria-hidden="true">MK</span>
      <div class="min-w-0">
        <p class="text-sm"><span class="font-medium">Mei Kato</span> <span class="text-muted-foreground">· 9:41</span></p>
        <p class="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
          Pushed the new checkout. The confirm button drips now, try it before standup?
        </p>
      </div>
    </div>
    <div class="mt-5 flex flex-wrap gap-2">
      <GoopButton size="sm" :disabled="archived" @click="archive">{{ archived ? 'Archived' : 'Archive' }}</GoopButton>
      <GoopButton size="sm" variant="outline" @click="star">Star</GoopButton>
    </div>

    <div class="mt-6 flex items-start gap-3 border-t border-border pt-5">
      <span class="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-sm font-medium" aria-hidden="true">JL</span>
      <div class="min-w-0">
        <p class="text-sm"><span class="font-medium">Jules Laurent</span> <span class="text-muted-foreground">· 8:12</span></p>
        <p class="mt-0.5 line-clamp-2 text-sm text-muted-foreground">Pricing copy is in. Two typos left, both mine.</p>
      </div>
    </div>
    <div class="mt-5 flex flex-wrap gap-2">
      <GoopButton size="sm" variant="outline" @click="pin">{{ pinned ? 'Unpin' : 'Pin' }}</GoopButton>
    </div>
  </LandingShowcaseTile>
</template>
