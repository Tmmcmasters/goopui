<script setup lang="ts">
// Live GoopToaster demo for the Toaster docs page. Mounts a GoopToaster and fires toasts at
// it with vue-sonner's toast(). Toasts land at the bottom right of the window.
import { toast } from 'vue-sonner'

const showDefault = () => toast('Event has been created', { description: 'Sunday, December 03, 2023 at 9:00 AM' })
const showSuccess = () => toast.success('Changes saved')
const showError = () => toast.error('Could not reach the server')
const showAction = () => toast('Message archived', { action: { label: 'Undo', onClick: () => toast('Restored') } })
const showPromise = () =>
  toast.promise(new Promise<{ name: string }>((resolve) => setTimeout(() => resolve({ name: 'goopUI' }), 1600)), {
    loading: 'Loading...',
    success: (data: { name: string }) => `${data.name} has been added`,
    error: 'Error',
  })
const showFive = () => [showDefault, showSuccess, showError, showAction, showPromise].forEach((fire, i) => setTimeout(fire, i * 180))
</script>

<template>
  <div class="flex flex-wrap items-center justify-center gap-3">
    <GoopButton variant="outline" @click="showDefault">Default</GoopButton>
    <GoopButton variant="outline" @click="showSuccess">Success</GoopButton>
    <GoopButton variant="outline" @click="showError">Error</GoopButton>
    <GoopButton variant="outline" @click="showAction">Action</GoopButton>
    <GoopButton variant="outline" @click="showPromise">Promise</GoopButton>
    <GoopButton @click="showFive">Show five</GoopButton>
    <ClientOnly>
      <GoopToaster />
    </ClientOnly>
  </div>
</template>
