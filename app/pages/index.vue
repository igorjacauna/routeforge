<script setup lang="ts">
useHead({
  title: 'RouteForge',
  meta: [
    { name: 'description', content: 'RouteForge - Your API Contract Editor' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
  ],
});
</script>
<template>
  <div class="h-dvh w-full">
    <Monaco class="h-dvh" />
  </div>
</template>