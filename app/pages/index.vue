<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const { login } = useAuth()
const isLoading = ref(false)

const handleLogin = async () => {
  isLoading.value = true
  await login()
}

useSeoMeta({
  title: 'RouteForge - API Route Documentation',
  description: 'Collaborate on API documentation with real-time editing and syntax highlighting'
})
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
    <div class="max-w-md w-full space-y-8">
      <!-- Logo -->
      <div class="text-center">
        <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          RouteForge
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Document your APIs in real-time
        </p>
      </div>

      <!-- Login Card -->
      <UCard class="rounded-lg shadow-lg">
        <template #header>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Get Started
          </h2>
        </template>

        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Sign in with your Google account to create and manage your API documentation workspace.
          </p>

          <UButton
            @click="handleLogin"
            icon="i-simple-icons-google"
            size="lg"
            block
            :loading="isLoading"
            color="gray"
          >
            Sign in with Google
          </UButton>
        </div>

        <template #footer>
          <p class="text-xs text-center text-gray-500 dark:text-gray-500">
            By signing in, you agree to our terms of service
          </p>
        </template>
      </UCard>

      <!-- Features -->
      <div class="grid grid-cols-1 gap-4 mt-8">
        <div class="flex items-start gap-3">
          <UIcon name="i-heroicons-check-circle-20-solid" class="text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 class="text-sm font-medium text-gray-900 dark:text-white">Real-time Collaboration</h3>
            <p class="text-xs text-gray-600 dark:text-gray-400">Edit with your team in real-time</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <UIcon name="i-heroicons-check-circle-20-solid" class="text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 class="text-sm font-medium text-gray-900 dark:text-white">Syntax Highlighting</h3>
            <p class="text-xs text-gray-600 dark:text-gray-400">TypeScript-like syntax for API routes</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <UIcon name="i-heroicons-check-circle-20-solid" class="text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 class="text-sm font-medium text-gray-900 dark:text-white">Share & Export</h3>
            <p class="text-xs text-gray-600 dark:text-gray-400">Share documentation with public links</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
