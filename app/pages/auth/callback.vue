<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Signing in...'
})

onMounted(() => {
  // The callback is handled by the server endpoint
  // This page should redirect automatically
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <h1 class="text-2xl font-bold mb-4">Signing in...</h1>
      <UProgress />
    </div>
  </div>
</template>
