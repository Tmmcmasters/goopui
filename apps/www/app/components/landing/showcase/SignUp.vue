<script setup lang="ts">
// A create-account form: Input, Textarea, Button with a Spinner while "submitting".
// Nothing is sent anywhere; the result line says so.
const uses = [
  { name: 'Input', slug: 'input', new: true },
  { name: 'Textarea', slug: 'textarea', new: true },
  { name: 'Button', slug: 'button' },
  { name: 'Spinner', slug: 'spinner' },
]

const id = useId()
const email = ref('')
const password = ref('')
const note = ref('')
const state = ref<'idle' | 'busy' | 'done'>('idle')
const invalid = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

function submit() {
  invalid.value = !/^\S+@\S+\.\S+$/.test(email.value)
  if (invalid.value || state.value === 'busy') return
  state.value = 'busy'
  timer = setTimeout(() => (state.value = 'done'), 1600)
}
function reset() {
  state.value = 'idle'
  email.value = password.value = note.value = ''
}
onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <LandingShowcaseTile :uses="uses">
    <h3 class="text-[15px] font-medium tracking-[-0.01em]">Create an account</h3>
    <p class="mt-0.5 text-sm text-muted-foreground">Start a project. Takes a minute.</p>

    <form v-if="state !== 'done'" class="mt-6 grid gap-4" novalidate @submit.prevent="submit">
      <div class="grid gap-1.5">
        <label :for="`${id}-email`" class="text-sm font-medium">Email</label>
        <GoopInput
          :id="`${id}-email`"
          v-model="email"
          type="email"
          autocomplete="off"
          placeholder="you@example.com"
          :aria-invalid="invalid || undefined"
          :aria-describedby="invalid ? `${id}-err` : undefined"
          @update:model-value="invalid = false"
        />
        <p v-if="invalid" :id="`${id}-err`" class="text-[13px] text-destructive">Enter an email like you@example.com.</p>
      </div>
      <div class="grid gap-1.5">
        <label :for="`${id}-pw`" class="text-sm font-medium">Password</label>
        <GoopInput :id="`${id}-pw`" v-model="password" type="password" autocomplete="new-password" placeholder="At least 8 characters" />
      </div>
      <div class="grid gap-1.5">
        <label :for="`${id}-note`" class="text-sm font-medium">
          What are you building? <span class="font-normal text-muted-foreground">(optional)</span>
        </label>
        <GoopTextarea :id="`${id}-note`" v-model="note" rows="3" placeholder="A dashboard that drips." />
      </div>
      <GoopButton type="submit" class="mt-1 w-full" :disabled="state === 'busy'">
        <GoopSpinner v-if="state === 'busy'" data-icon="inline-start" />
        {{ state === 'busy' ? 'Creating account' : 'Create account' }}
      </GoopButton>
    </form>

    <div v-else class="mt-6 grid gap-4" role="status">
      <p class="text-sm leading-relaxed">
        Welcome aboard. <span class="text-muted-foreground">This is a demo, so nothing was sent.</span>
      </p>
      <GoopButton variant="outline" class="w-full" @click="reset">Try it again</GoopButton>
    </div>
  </LandingShowcaseTile>
</template>
