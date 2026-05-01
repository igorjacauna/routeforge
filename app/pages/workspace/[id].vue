<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const workspaceId = route.params.id as string

// Composables
const {
  files,
  folders,
  isLoading,
  fetchWorkspace,
  createFile,
  createFolder,
  updateFile,
  deleteFile,
  renameFile,
  renameFolder,
  deleteFolder,
  moveFile,
  moveFolder
} = useFiles()

const {
  selectedFileId,
  expandedFolderIds,
  selectFile,
  toggleFolder
} = useWorkspaceUI()

const fileContent = ref('')
const isSaving = ref(false)
const saveTimeout = ref<NodeJS.Timeout | null>(null)
const breadcrumbs = ref<Array<{ id: string; name: string }>>([])

useSeoMeta({
  title: 'Workspace - RouteForge'
})

// Current file derived from selectedFileId
const currentFile = computed(() => {
  if (!selectedFileId.value) return null
  return files.value.find((f) => f.id === selectedFileId.value)
})

// Update breadcrumbs when file is selected
watch(
  () => selectedFileId.value,
  () => {
    updateBreadcrumbs()
  }
)

const updateBreadcrumbs = () => {
  breadcrumbs.value = []
  if (!selectedFileId.value) return

  const file = files.value.find((f) => f.id === selectedFileId.value)
  if (!file) return

  // Build breadcrumb path by walking up the folder tree
  let currentFolderId = file.parentFolderId

  while (currentFolderId) {
    const folder = folders.value.find((f) => f.id === currentFolderId)
    if (!folder) break

    breadcrumbs.value.unshift({ id: folder.id, name: folder.name })
    currentFolderId = folder.parentFolderId
  }
}

// Handle file selection
const handleSelectFile = (fileId: string) => {
  selectFile(fileId)
  const file = files.value.find((f) => f.id === fileId)
  if (file) {
    fileContent.value = file.content || ''
  }
}

// Handle content changes with debounced save
const handleContentChange = (newContent: string) => {
  fileContent.value = newContent

  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value)
  }

  saveTimeout.value = setTimeout(() => {
    saveFile()
  }, 2000)
}

const saveFile = async () => {
  if (!currentFile.value) return

  try {
    isSaving.value = true
    await updateFile(currentFile.value.id, fileContent.value)
  } catch (err) {
    console.error('Save error:', err)
  } finally {
    isSaving.value = false
  }
}

// File operations
const handleCreateFile = async (parentFolderId: string | null, name: string) => {
  try {
    const file = await createFile(workspaceId, name, parentFolderId || undefined)
    handleSelectFile(file.id)
  } catch (err) {
    console.error('Create file error:', err)
  }
}

const handleCreateFolder = async (parentFolderId: string | null, name: string) => {
  try {
    await createFolder(workspaceId, name, parentFolderId || undefined)
  } catch (err) {
    console.error('Create folder error:', err)
  }
}

const handleRename = async (id: string, newName: string, type: 'file' | 'folder') => {
  try {
    if (type === 'file') {
      await renameFile(id, newName)
    } else {
      await renameFolder(id, newName)
    }
  } catch (err) {
    console.error('Rename error:', err)
  }
}

const handleDelete = async (id: string, type: 'file' | 'folder') => {
  try {
    if (type === 'file') {
      if (selectedFileId.value === id) {
        selectFile(null)
        fileContent.value = ''
      }
      await deleteFile(id)
    } else {
      await deleteFolder(id)
    }
  } catch (err) {
    console.error('Delete error:', err)
  }
}

const handleMove = async (id: string, newParentId: string | null, type: 'file' | 'folder') => {
  try {
    if (type === 'file') {
      await moveFile(id, newParentId || '')
    } else {
      await moveFolder(id, newParentId || '')
    }
  } catch (err) {
    console.error('Move error:', err)
  }
}

const handleBreadcrumbNavigate = (folderId: string | null) => {
  selectFile(null)
  fileContent.value = ''
}

// Initialize
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
  <div class="h-full flex flex-col">
    <!-- Breadcrumb Navigation -->
    <BreadcrumbNav
      :breadcrumbs="breadcrumbs"
      @navigate="handleBreadcrumbNavigate"
    />

    <!-- Main Editor Area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- File Explorer Sidebar -->
      <FileExplorer
        :files="files"
        :folders="folders"
        :selected-file-id="selectedFileId"
        :is-loading="isLoading"
        @select-file="handleSelectFile"
        @create-file="handleCreateFile"
        @create-folder="handleCreateFolder"
        @rename="handleRename"
        @delete="handleDelete"
        @move="handleMove"
      />

      <!-- Editor Panel -->
      <main class="flex-1 flex flex-col overflow-hidden">
        <!-- Editor Header -->
        <div
          v-if="currentFile"
          class="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 px-6 py-3 flex items-center justify-between"
        >
          <div>
            <h2 class="font-semibold text-gray-900 dark:text-white">
              {{ currentFile.name }}
            </h2>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ isSaving ? 'Saving...' : 'All changes saved' }}
            </p>
          </div>
        </div>

        <!-- Editor Component -->
        <RouteEditor
          v-if="currentFile"
          :key="currentFile.id"
          :content="fileContent"
          :file-name="currentFile.name"
          @update:content="handleContentChange"
          @save="saveFile"
        />

        <!-- Empty State -->
        <div v-else class="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div class="text-center">
            <UIcon
              name="i-heroicons-document-text"
              class="w-12 h-12 text-gray-400 mx-auto mb-4"
            />
            <p class="text-gray-500 dark:text-gray-400">
              Select a file to edit
            </p>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
