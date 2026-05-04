<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const route = useRoute()
const workspaceId = route.params.id as string

const {
  files,
  folders,
  isLoading,
  pendingItems,
  fetchWorkspace,
  createFile,
  createFolder,
  deleteFile,
  renameFile,
  renameFolder,
  deleteFolder,
  moveFile,
  moveFolder
} = useFiles()

const {
  selectedFileId,
  selectFile
} = useWorkspaceUI()

const toast = useToast()

const breadcrumbs = ref<Array<{ id: string; name: string }>>([])
const editorSaveState = ref<'idle' | 'saving' | 'saved'>('idle')

useSeoMeta({
  title: 'Workspace - RouteForge'
})

const currentFile = computed(() => {
  if (!selectedFileId.value) return null
  return files.value.find((f) => f.id === selectedFileId.value)
})

watch(
  () => selectedFileId.value,
  () => {
    updateBreadcrumbs()
    editorSaveState.value = 'idle'
  }
)

const updateBreadcrumbs = () => {
  breadcrumbs.value = []
  if (!selectedFileId.value) return

  const file = files.value.find((f) => f.id === selectedFileId.value)
  if (!file) return

  let currentFolderId = file.parentFolderId

  while (currentFolderId) {
    const folder = folders.value.find((f) => f.id === currentFolderId)
    if (!folder) break

    breadcrumbs.value.unshift({ id: folder.id, name: folder.name })
    currentFolderId = folder.parentFolderId
  }
}

const handleSelectFile = (fileId: string) => {
  selectFile(fileId)
}

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
      await moveFile(id, newParentId)
    } else {
      await moveFolder(id, newParentId)
    }
  } catch (err: any) {
    console.error('Move error:', err)
    toast.add({
      title: `Failed to move ${type}`,
      description: err?.statusMessage || err?.message || 'Please try again.',
      color: 'error',
      icon: 'i-lucide-alert-triangle'
    })
  }
}

const handleBreadcrumbNavigate = () => {
  selectFile(null)
}

const handleCreateFirstFile = () => {
  const name = window.prompt('File name:', 'untitled.route')
  if (name?.trim()) {
    handleCreateFile(null, name.trim())
  }
}

onMounted(async () => {
  try {
    await fetchWorkspace(workspaceId)
  } catch (err) {
    console.error('Error loading workspace:', err)
  }
})
</script>

<template>
  <div class="flex flex-1 min-h-0 overflow-hidden">
    <!-- Sidebar: File Explorer -->
    <aside
      class="w-64 shrink-0 border-r border-default bg-elevated/30 flex flex-col min-h-0"
    >
      <FileExplorer
        :files="files"
        :folders="folders"
        :selected-file-id="selectedFileId"
        :is-loading="isLoading"
        :pending-items="pendingItems"
        @select-file="handleSelectFile"
        @create-file="handleCreateFile"
        @create-folder="handleCreateFolder"
        @rename="handleRename"
        @delete="handleDelete"
        @move="handleMove"
      />
    </aside>

    <!-- Editor area -->
    <section class="flex-1 flex flex-col min-w-0 min-h-0">
      <!-- File header -->
      <header
        v-if="currentFile"
        class="flex items-center justify-between gap-3 border-b border-default bg-default px-6 h-12 shrink-0"
      >
        <div class="flex items-center gap-3 min-w-0">
          <BreadcrumbNav
            :breadcrumbs="breadcrumbs"
            @navigate="handleBreadcrumbNavigate"
          />
          <UIcon name="i-lucide-chevron-right" class="size-4 text-muted shrink-0" />
          <UIcon name="i-lucide-file-code-2" class="size-4 text-primary shrink-0" />
          <span class="font-medium text-sm truncate">{{ currentFile.name }}</span>
        </div>

        <div class="flex items-center gap-3 shrink-0">
          <Transition
            enter-active-class="transition-opacity duration-150"
            enter-from-class="opacity-0"
            leave-active-class="transition-opacity duration-150"
            leave-to-class="opacity-0"
            mode="out-in"
          >
            <div
              v-if="editorSaveState === 'saving'"
              class="flex items-center gap-1.5 text-xs text-muted"
            >
              <UIcon name="i-lucide-loader-2" class="size-3.5 animate-spin" />
              <span>Saving...</span>
            </div>
            <div
              v-else-if="editorSaveState === 'saved'"
              class="flex items-center gap-1.5 text-xs text-success"
            >
              <UIcon name="i-lucide-check" class="size-3.5" />
              <span>Saved</span>
            </div>
            <div v-else class="text-xs text-muted/60">All changes saved</div>
          </Transition>
        </div>
      </header>

      <!-- Editor or empty state -->
      <div class="flex-1 min-h-0 flex flex-col">
        <RouteEditor
          v-if="currentFile"
          :key="currentFile.id"
          :file-id="currentFile.id"
          :file-name="currentFile.name"
          @save-state-change="editorSaveState = $event"
        />

        <div
          v-else
          class="flex-1 flex items-center justify-center bg-elevated/20"
        >
          <div class="text-center max-w-sm px-6">
            <div
              class="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <UIcon name="i-lucide-file-plus-2" class="size-7" />
            </div>
            <h3 class="text-base font-semibold mb-1">No file selected</h3>
            <p class="text-sm text-muted mb-5">
              Select a file from the sidebar to start editing, or create a new one.
            </p>
            <UButton
              icon="i-lucide-plus"
              color="primary"
              size="sm"
              @click="handleCreateFirstFile"
            >
              New file
            </UButton>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
