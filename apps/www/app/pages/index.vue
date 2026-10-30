<script setup lang="ts">
// Loaded up front so the landing links only to component docs that exist.
await useDocsNav()

useSeoMeta({
  title: 'goopUI',
  description: 'goopUI is the shadcn catalog made gooey: same components and API, built on reka-ui, with drips and squish from a tiny physics engine.',
})
</script>

<template>
  <div>
    <LandingHero />
    <LandingShowcase />
    <LandingWhatItIs />
    <LandingComponents />
    <LandingFrameworks />
    <LandingTheming />
    <LandingAccessibility />
    <LandingInstall />
  </div>
</template>
