<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const route = useRoute()
const workspaceId = route.params.id as string

const { files, folders, isLoading, fetchWorkspace } = useFiles()
const currentFile = ref<any>(null)
const fileContent = ref('')
const isSaving = ref(false)
const saveTimeout = ref<NodeJS.Timeout | null>(null)

useSeoMeta({
  title: 'Workspace - RouteForge'
})

const onFileSelect = (file: any) => {
  currentFile.value = file
  fileContent.value = file.content || ''
}

const onContentChange = (newContent: string) => {
  fileContent.value = newContent

  // Clear previous timeout
  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value)
  }

  // Debounce save by 2 seconds
  saveTimeout.value = setTimeout(() => {
    saveFile()
  }, 2000)
}

const saveFile = async () => {
  if (!currentFile.value) return

  try {
    isSaving.value = true
    const { updateFile } = useFiles()
    await updateFile(currentFile.value.id, fileContent.value)
  } catch (err) {
    console.error('Save error:', err)
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  try {
    await fetchWorkspace(workspaceId)
  } catch (err) {
    console.error('Error loading workspace:', err)
  }
})

onUnmounted(() => {
  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value)
  }
})
</script>

<template>
  <div class="h-full flex">
    <!-- Sidebar: File Tree -->
    <aside class="w-64 border-r border-gray-200 dark:border-gray-800 overflow-y-auto bg-white dark:bg-gray-800">
      <div class="p-4">
        <h2 class="font-semibold text-gray-900 dark:text-white mb-3">
          Files
        </h2>

        <div v-if="isLoading" class="text-sm text-gray-500">
          Loading...
        </div>

        <div v-else class="space-y-1">
          <!-- Files list -->
          <div
            v-for="file in files"
            :key="file.id"
            @click="onFileSelect(file)"
            :class="[
              'p-2 rounded cursor-pointer text-sm',
              currentFile?.id === file.id
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            ]"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-document" class="w-4 h-4" />
              {{ file.name }}
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="files.length === 0" class="text-xs text-gray-500 p-2">
            No files yet. Create one to get started!
          </div>
        </div>
      </div>
    </aside>

    <!-- Main: Editor -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- Editor Header -->
      <div v-if="currentFile" class="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 px-6 py-3 flex items-center justify-between">
        <div>
          <h2 class="font-semibold text-gray-900 dark:text-white">
            {{ currentFile.name }}
          </h2>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ isSaving ? 'Saving...' : 'All changes saved' }}
          </p>
        </div>
      </div>

      <!-- Editor -->
      <div v-if="currentFile" class="flex-1 overflow-hidden">
        <textarea
          v-model="fileContent"
          @input="onContentChange($event.target.value)"
          class="w-full h-full p-6 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-0 resize-none focus:outline-none"
          placeholder="# API Route Documentation&#10;&#10;Start typing your route documentation here..."
        />
      </div>

      <!-- Empty State -->
      <div v-else class="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div class="text-center">
          <UIcon name="i-heroicons-document-text" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p class="text-gray-500 dark:text-gray-400">
            Select a file to edit
          </p>
        </div>
      </div>
    </main>
  </div>
</template>
