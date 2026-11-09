<script setup lang="ts">
// Live item demos for the Item docs page: real <GoopItemGroup> / <GoopItem>s. `set` picks the
// group. Keep each set in sync with the code sample beside it in the docs (and
// react-demos/display.tsx).
const props = withDefaults(defineProps<{ set?: 'basic' | 'variants' }>(), { set: 'basic' })
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
// On /react/docs: the same sets, as real @goopui/react components (react-demos/display.tsx).
const { isReact } = useFramework()

const people = [
  { name: 'Ada Lovelace', email: 'ada@example.com', initials: 'AL' },
  { name: 'Grace Hopper', email: 'grace@example.com', initials: 'GH' },
  { name: 'Alan Turing', email: 'alan@example.com', initials: 'AT' },
]
</script>

<template>
  <ReactIsland v-if="isReact" demo="item" :set="props.set" :pg="{ main: pg.props }" />
  <GoopItemGroup v-else-if="props.set === 'basic'" class="w-full max-w-sm gap-1" v-bind="pg.props">
    <GoopItem v-for="p in people" :key="p.email" as-child size="sm">
      <a href="#" @click.prevent>
        <GoopItemMedia>
          <GoopAvatar class="size-8">
            <GoopAvatarFallback class="text-xs">{{ p.initials }}</GoopAvatarFallback>
          </GoopAvatar>
        </GoopItemMedia>
        <GoopItemContent class="gap-0.5">
          <GoopItemTitle>{{ p.name }}</GoopItemTitle>
          <GoopItemDescription>{{ p.email }}</GoopItemDescription>
        </GoopItemContent>
        <GoopItemActions>
          <SiteIcon name="arrowRight" :size="16" class="text-muted-foreground" />
        </GoopItemActions>
      </a>
    </GoopItem>
  </GoopItemGroup>
  <div v-else class="flex w-full max-w-md flex-col gap-4">
    <GoopItem variant="outline">
      <GoopItemContent>
        <GoopItemTitle>Basic Item</GoopItemTitle>
        <GoopItemDescription>A simple item with title and description.</GoopItemDescription>
      </GoopItemContent>
      <GoopItemActions>
        <GoopButton variant="outline" size="sm">Action</GoopButton>
      </GoopItemActions>
    </GoopItem>
    <GoopItem variant="muted" as-child size="sm">
      <a href="#" @click.prevent>
        <GoopItemMedia variant="icon">
          <SiteIcon name="circleCheck" />
        </GoopItemMedia>
        <GoopItemContent>
          <GoopItemTitle>Your profile has been verified.</GoopItemTitle>
        </GoopItemContent>
        <GoopItemActions>
          <SiteIcon name="arrowRight" :size="16" />
        </GoopItemActions>
      </a>
    </GoopItem>
  </div>
</template>
