<script setup lang="ts">
// A project card whose actions open each overlay: Dialog, AlertDialog, Sheet, Drawer.
const uses = [
  { name: 'Dialog', slug: 'dialog', new: true },
  { name: 'AlertDialog', slug: 'alert-dialog', new: true },
  { name: 'Sheet', slug: 'sheet', new: true },
  { name: 'Drawer', slug: 'drawer', new: true },
]

const id = useId()
const name = ref('Checkout redesign')
const draftName = ref(name.value)
const deleted = ref(false)
const goal = ref(300)
const bump = (d: number) => (goal.value = Math.min(400, Math.max(200, goal.value + d)))
const notify = ref(true)
</script>

<template>
  <LandingShowcaseTile :uses="uses">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="truncate text-[15px] font-medium tracking-[-0.01em]" :class="deleted && 'text-muted-foreground line-through'">
          {{ name }}
        </h3>
        <p class="mt-0.5 text-sm text-muted-foreground">
          {{ deleted ? 'Deleted. Refresh to bring it back.' : `Daily goal ${goal} commits. Updated just now.` }}
        </p>
      </div>
    </div>

    <dl class="meta mt-5">
      <div><dt>Owner</dt><dd>Ana Ruiz</dd></div>
      <div><dt>Members</dt><dd>4 people</dd></div>
      <div><dt>Due</dt><dd>Friday</dd></div>
    </dl>

    <div class="mt-5 grid grid-cols-2 gap-2.5">
      <GoopDialog @update:open="(o) => o && (draftName = name)">
        <GoopDialogTrigger as-child>
          <GoopButton variant="outline" class="w-full">Rename</GoopButton>
        </GoopDialogTrigger>
        <GoopDialogContent class="sm:max-w-[425px]">
          <GoopDialogHeader>
            <GoopDialogTitle>Rename project</GoopDialogTitle>
            <GoopDialogDescription>Give it a name your team will recognise.</GoopDialogDescription>
          </GoopDialogHeader>
          <div class="grid gap-1.5">
            <label :for="`${id}-name`" class="text-sm font-medium">Name</label>
            <GoopInput :id="`${id}-name`" v-model="draftName" />
          </div>
          <GoopDialogFooter>
            <GoopDialogClose as-child>
              <GoopButton variant="outline">Cancel</GoopButton>
            </GoopDialogClose>
            <GoopDialogClose as-child>
              <GoopButton @click="name = draftName.trim() || name">Save</GoopButton>
            </GoopDialogClose>
          </GoopDialogFooter>
        </GoopDialogContent>
      </GoopDialog>

      <GoopSheet>
        <GoopSheetTrigger as-child>
          <GoopButton variant="outline" class="w-full">Settings</GoopButton>
        </GoopSheetTrigger>
        <GoopSheetContent side="right">
          <GoopSheetHeader>
            <GoopSheetTitle>Project settings</GoopSheetTitle>
            <GoopSheetDescription>Changes save when you close the sheet.</GoopSheetDescription>
          </GoopSheetHeader>
          <div class="grid gap-5 px-4">
            <div class="grid gap-1.5">
              <label :for="`${id}-sheet-name`" class="text-sm font-medium">Name</label>
              <GoopInput :id="`${id}-sheet-name`" v-model="name" />
            </div>
            <label class="flex items-center justify-between gap-4 text-sm">
              Email the team on changes
              <GoopSwitch v-model="notify" />
            </label>
          </div>
          <GoopSheetFooter>
            <GoopSheetClose as-child>
              <GoopButton>Done</GoopButton>
            </GoopSheetClose>
          </GoopSheetFooter>
        </GoopSheetContent>
      </GoopSheet>

      <GoopDrawer>
        <GoopDrawerTrigger as-child>
          <GoopButton variant="outline" class="w-full">Set goal</GoopButton>
        </GoopDrawerTrigger>
        <GoopDrawerContent>
          <div class="mx-auto w-full max-w-sm">
            <GoopDrawerHeader>
              <GoopDrawerTitle>Daily goal</GoopDrawerTitle>
              <GoopDrawerDescription>Commits per day for this project.</GoopDrawerDescription>
            </GoopDrawerHeader>
            <div class="flex items-center justify-center gap-6 p-4 pb-0">
              <GoopButton variant="outline" size="icon" class="rounded-full" :disabled="goal <= 200" aria-label="Lower goal" @click="bump(-10)">
                <SiteIcon name="minus" :size="16" />
              </GoopButton>
              <div class="text-center">
                <div class="type-display text-7xl tabular-nums">{{ goal }}</div>
                <div class="mt-1 text-xs text-muted-foreground">commits / day</div>
              </div>
              <GoopButton variant="outline" size="icon" class="rounded-full" :disabled="goal >= 400" aria-label="Raise goal" @click="bump(10)">
                <SiteIcon name="plus" :size="16" />
              </GoopButton>
            </div>
            <GoopDrawerFooter>
              <GoopDrawerClose as-child>
                <GoopButton>Save goal</GoopButton>
              </GoopDrawerClose>
            </GoopDrawerFooter>
          </div>
        </GoopDrawerContent>
      </GoopDrawer>

      <GoopAlertDialog>
        <GoopAlertDialogTrigger as-child>
          <GoopButton variant="destructive" class="w-full" :disabled="deleted">Delete</GoopButton>
        </GoopAlertDialogTrigger>
        <GoopAlertDialogContent>
          <GoopAlertDialogHeader>
            <GoopAlertDialogTitle>Delete “{{ name }}”?</GoopAlertDialogTitle>
            <GoopAlertDialogDescription>
              This removes the project and its history. (On this page, a refresh brings it back.)
            </GoopAlertDialogDescription>
          </GoopAlertDialogHeader>
          <GoopAlertDialogFooter>
            <GoopAlertDialogCancel>Keep it</GoopAlertDialogCancel>
            <GoopAlertDialogAction @click="deleted = true">Delete project</GoopAlertDialogAction>
          </GoopAlertDialogFooter>
        </GoopAlertDialogContent>
      </GoopAlertDialog>
    </div>
  </LandingShowcaseTile>
</template>

<style scoped>
.meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-block: 1px solid var(--border);
  font-size: 0.8125rem;
}
.meta dt {
  color: var(--muted-foreground);
}
.meta dd {
  margin-top: 0.125rem;
  font-weight: 500;
}
</style>
