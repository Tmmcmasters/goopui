<script setup lang="ts">
// A project list's toolbar: Tabs on the left; Select, Tooltip'd icon buttons, a share
// Popover and an actions DropdownMenu on the right.
const uses = [
  { name: 'Tabs', slug: 'tabs' },
  { name: 'Select', slug: 'select', new: true },
  { name: 'Tooltip', slug: 'tooltip' },
  { name: 'Popover', slug: 'popover' },
  { name: 'DropdownMenu', slug: 'dropdown-menu' },
]

type Row = { name: string; who: string; when: string; mins: number }
const rows: Record<string, Row[]> = {
  active: [
    { name: 'Checkout redesign', who: 'Ana, Kofi', when: '2 min ago', mins: 2 },
    { name: 'Onboarding emails', who: 'Mei', when: '1 hour ago', mins: 60 },
    { name: 'Pricing page', who: 'Jules, Ana', when: 'Yesterday', mins: 1440 },
  ],
  review: [
    { name: 'Settings v2', who: 'Kofi', when: '20 min ago', mins: 20 },
    { name: 'Mobile nav', who: 'Mei, Jules', when: '3 days ago', mins: 4320 },
  ],
  done: [
    { name: 'Dark mode', who: 'Ana', when: 'Last week', mins: 10080 },
    { name: 'Search', who: 'Jules', when: 'Last month', mins: 43200 },
    { name: 'Avatar upload', who: 'Mei', when: 'Last month', mins: 44000 },
  ],
}
const tab = ref('active')
const sort = ref('recent')
const sorted = (list: Row[]) =>
  [...list].sort((a, b) => (sort.value === 'name' ? a.name.localeCompare(b.name) : sort.value === 'oldest' ? b.mins - a.mins : a.mins - b.mins))

const id = useId()
const copied = ref(false)
async function copyLink() {
  try {
    await navigator.clipboard.writeText('https://goop.timmcmasters.work')
  } catch {}
  copied.value = true
  setTimeout(() => (copied.value = false), 1400)
}
</script>

<template>
  <LandingShowcaseTile :uses="uses">
    <GoopTabs v-model="tab">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <GoopTabsList>
          <GoopTabsTrigger value="active">Active</GoopTabsTrigger>
          <GoopTabsTrigger value="review">In review</GoopTabsTrigger>
          <GoopTabsTrigger value="done">Done</GoopTabsTrigger>
        </GoopTabsList>

        <div class="flex flex-wrap items-center gap-2">
          <GoopSelect v-model="sort">
            <GoopSelectTrigger class="w-36" size="sm" aria-label="Sort projects">
              <GoopSelectValue />
            </GoopSelectTrigger>
            <GoopSelectContent>
              <GoopSelectItem value="recent">Most recent</GoopSelectItem>
              <GoopSelectItem value="oldest">Oldest first</GoopSelectItem>
              <GoopSelectItem value="name">Name</GoopSelectItem>
            </GoopSelectContent>
          </GoopSelect>

          <GoopTooltip>
            <GoopTooltipTrigger as-child>
              <GoopButton variant="ghost" size="icon-sm" aria-label="Search projects">
                <SiteIcon name="search" :size="16" />
              </GoopButton>
            </GoopTooltipTrigger>
            <GoopTooltipContent>Search</GoopTooltipContent>
          </GoopTooltip>

          <GoopPopover>
            <GoopPopoverTrigger as-child>
              <GoopButton variant="outline" size="sm">
                <SiteIcon name="share" :size="15" data-icon="inline-start" />
                Share
              </GoopButton>
            </GoopPopoverTrigger>
            <GoopPopoverContent class="w-72" align="end">
              <GoopPopoverHeader>
                <GoopPopoverTitle>Share this board</GoopPopoverTitle>
                <GoopPopoverDescription>Anyone with the link can view it.</GoopPopoverDescription>
              </GoopPopoverHeader>
              <div class="mt-3 flex items-center gap-2">
                <label :for="`${id}-link`" class="sr-only">Link</label>
                <GoopInput :id="`${id}-link`" model-value="goop.timmcmasters.work" readonly class="h-8 text-[13px]" :goo="false" />
                <GoopButton size="sm" @click="copyLink">{{ copied ? 'Copied' : 'Copy' }}</GoopButton>
              </div>
            </GoopPopoverContent>
          </GoopPopover>

          <GoopDropdownMenu>
            <GoopDropdownMenuTrigger as-child>
              <GoopButton variant="outline" size="icon-sm" aria-label="More actions">
                <SiteIcon name="more" :size="16" />
              </GoopButton>
            </GoopDropdownMenuTrigger>
            <GoopDropdownMenuContent class="w-44" align="end">
              <GoopDropdownMenuLabel>Board</GoopDropdownMenuLabel>
              <GoopDropdownMenuItem>Rename</GoopDropdownMenuItem>
              <GoopDropdownMenuItem>Duplicate</GoopDropdownMenuItem>
              <GoopDropdownMenuItem>Archive</GoopDropdownMenuItem>
              <GoopDropdownMenuSeparator />
              <GoopDropdownMenuItem variant="destructive">Delete</GoopDropdownMenuItem>
            </GoopDropdownMenuContent>
          </GoopDropdownMenu>
        </div>
      </div>

      <GoopTabsContent v-for="(list, key) in rows" :key="key" :value="key" class="mt-4">
        <ul class="divide-y divide-border rounded-xl border border-border">
          <li v-for="r in sorted(list)" :key="r.name" class="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <span class="min-w-0 truncate font-medium">{{ r.name }}</span>
            <span class="flex shrink-0 items-center gap-4 text-[13px] text-muted-foreground">
              <span class="hidden sm:inline">{{ r.who }}</span>
              <span class="w-20 text-right tabular-nums">{{ r.when }}</span>
            </span>
          </li>
        </ul>
      </GoopTabsContent>
    </GoopTabs>
  </LandingShowcaseTile>
</template>
