<template>
  <span class="new-tag">New</span>
</template>

<style scoped>
.new-tag {
  display: inline-flex;
  align-items: center;
  height: 1.05rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1;
  color: var(--goo-ink);
  background: color-mix(in oklch, var(--slime) 14%, transparent);
}
</style>
