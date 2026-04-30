<script setup lang="ts">
const { logout, user, isLoading } = useAuth()
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
      <div class="px-6 py-3 flex items-center justify-between">
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">
          RouteForge
        </h1>

        <div class="flex items-center gap-3">
          <UDropdown
            :items="[[{ label: 'Logout', icon: 'i-heroicons-arrow-left-on-rectangle', click: logout }]]"
          >
            <UButton variant="ghost" icon="i-heroicons-user-circle">
              {{ user?.email || 'User' }}
            </UButton>
          </UDropdown>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1 overflow-hidden">
      <NuxtPage />
    </div>
  </div>
</template>
