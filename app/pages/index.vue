<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: 'auth'
})

const { login } = useAuth()
const email = ref('')
const isLoading = ref(false)
const sent = ref(false)
const error = ref<string | null>(null)

const handleLogin = async () => {
  error.value = null
  if (!email.value.includes('@')) {
    error.value = 'Enter a valid email address'
    return
  }
  isLoading.value = true
  const result = await login(email.value)
  isLoading.value = false
  if (!result.error) {
    sent.value = true
  } else {
    error.value = result.error.message
  }
}

useSeoMeta({
  title: 'RouteForge - API Route Documentation',
  description: 'Collaborate on API documentation with real-time editing and syntax highlighting'
})
</script>

<template>
  <div class="flex flex-col items-center justify-center px-4">
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

        <div
          v-if="!sent"
          class="space-y-4"
        >
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Enter your email to sign in or create an account.
          </p>

          <form
            class="space-y-3"
            @submit.prevent="handleLogin"
          >
            <UInput
              v-model="email"
              type="email"
              placeholder="you@example.com"
              size="lg"
              autocomplete="email"
              :disabled="isLoading"
              class="w-full"
            />

            <p
              v-if="error"
              class="text-sm text-red-500"
            >
              {{ error }}
            </p>

            <UButton
              type="submit"
              size="lg"
              block
              :loading="isLoading"
              color="primary"
            >
              Send code
            </UButton>
          </form>
        </div>

        <div
          v-else
          class="space-y-4 text-center"
        >
          <UIcon
            name="i-heroicons-envelope-20-solid"
            class="w-10 h-10 mx-auto text-green-500"
          />
          <p class="text-sm text-gray-700 dark:text-gray-300 font-medium">
            Check your email
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            We sent a magic link to <strong>{{ email }}</strong>
          </p>
          <UButton
            variant="ghost"
            size="sm"
            @click="sent = false"
          >
            Use a different email
          </UButton>
        </div>

        <template #footer>
          <p class="text-xs text-center text-gray-500 dark:text-gray-500">
            No password needed — just click the link we email you
          </p>
        </template>
      </UCard>

      <!-- Features -->
      <div class="grid grid-cols-1 gap-4 mt-8">
        <div class="flex items-start gap-3">
          <UIcon
            name="i-heroicons-check-circle-20-solid"
            class="text-green-500 flex-shrink-0 mt-0.5"
          />
          <div>
            <h3 class="text-sm font-medium text-gray-900 dark:text-white">
              Real-time Collaboration
            </h3>
            <p class="text-xs text-gray-600 dark:text-gray-400">
              Edit with your team in real-time
            </p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <UIcon
            name="i-heroicons-check-circle-20-solid"
            class="text-green-500 flex-shrink-0 mt-0.5"
          />
          <div>
            <h3 class="text-sm font-medium text-gray-900 dark:text-white">
              Syntax Highlighting
            </h3>
            <p class="text-xs text-gray-600 dark:text-gray-400">
              TypeScript-like syntax for API routes
            </p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <UIcon
            name="i-heroicons-check-circle-20-solid"
            class="text-green-500 flex-shrink-0 mt-0.5"
          />
          <div>
            <h3 class="text-sm font-medium text-gray-900 dark:text-white">
              Share & Export
            </h3>
            <p class="text-xs text-gray-600 dark:text-gray-400">
              Share documentation with public links
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
