<template>
  <nav class="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
    <div class="flex items-center gap-2 text-sm">
      <!-- Workspace root -->
      <button
        @click="$emit('navigate', null)"
        class="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <UIcon name="i-heroicons-folder" class="w-4 h-4" />
        <span class="text-gray-900 dark:text-gray-100">Workspace</span>
      </button>

      <!-- Breadcrumb items -->
      <template v-for="(breadcrumb, idx) in breadcrumbs" :key="breadcrumb.id">
        <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400" />
        <button
          @click="$emit('navigate', breadcrumb.id)"
          :class="[
            'flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors',
            idx === breadcrumbs.length - 1 ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-600 dark:text-gray-400'
          ]"
        >
          <UIcon name="i-heroicons-folder" class="w-4 h-4" />
          <span>{{ breadcrumb.name }}</span>
        </button>
      </template>
    </div>
  </nav>
</template>

<script setup lang="ts">
interface Breadcrumb {
  id: string
  name: string
}

defineProps<{
  breadcrumbs: Breadcrumb[]
}>()

defineEmits<{
  navigate: [folderId: string | null]
}>()
</script>
