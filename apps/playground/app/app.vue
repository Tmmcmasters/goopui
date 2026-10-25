<script setup lang="ts">
import { VERSION, defaultGoopOptions } from '@goopui/core'
</script>

<template>
  <main>
    <h1>goopUI playground</h1>
    <p>@goopui/core v{{ VERSION }}</p>
    <pre>{{ defaultGoopOptions }}</pre>
  </main>
</template>
