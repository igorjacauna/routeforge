<template>
  <aside class="w-64 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-800 h-full">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <h2 class="font-semibold text-gray-900 dark:text-white mb-3">Files</h2>
      <div class="flex gap-2">
        <UButton
          icon="i-heroicons-document-plus"
          size="sm"
          @click="createFileInRoot"
          title="New File"
        />
        <UButton
          icon="i-heroicons-folder-plus"
          size="sm"
          @click="createFolderInRoot"
          title="New Folder"
        />
      </div>
    </div>

    <!-- Tree View -->
    <div v-if="isLoading" class="p-4 text-sm text-gray-500">
      Loading...
    </div>

    <div v-else class="flex-1 overflow-y-auto">
      <!-- Root files and folders -->
      <div class="p-2">
        <!-- Root folders -->
        <FileTreeNode
          v-for="folder in rootFolders"
          :key="folder.id"
          :item="folder"
          :depth="0"
          :selected-file-id="selectedFileId"
          :expanded-folders="expandedFolders"
          :rename-id="renamingId"
          :all-files="files"
          :all-folders="folders"
          @select-file="$emit('select-file', $event)"
          @create-file="onCreateFile"
          @create-folder="onCreateFolder"
          @rename="onRename"
          @delete="onDelete"
          @move="onMove"
          @toggle-folder="toggleFolder"
          @context-menu="handleContextMenu"
        />

        <!-- Root files -->
        <FileTreeNode
          v-for="file in rootFiles"
          :key="file.id"
          :item="file"
          :depth="0"
          :selected-file-id="selectedFileId"
          :expanded-folders="expandedFolders"
          :rename-id="renamingId"
          :all-files="files"
          :all-folders="folders"
          @select-file="$emit('select-file', $event)"
          @create-file="onCreateFile"
          @create-folder="onCreateFolder"
          @rename="onRename"
          @delete="onDelete"
          @move="onMove"
          @toggle-folder="toggleFolder"
          @context-menu="handleContextMenu"
        />

        <!-- Empty state -->
        <div
          v-if="files.length === 0 && folders.length === 0"
          class="p-4 text-center text-sm text-gray-500"
        >
          <p>No files yet</p>
          <p class="text-xs mt-1">Click + above to create</p>
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <ContextMenu
      :visible="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenuItems"
      @select="handleContextMenuSelect"
      @close="hideContextMenu"
    />
  </aside>
</template>

<script setup lang="ts">
interface FileItem {
  id: string
  name: string
  parentFolderId?: string | null
  content?: string
}

interface ContextMenuItem {
  id: string
  label: string
  icon: string
  dangerous?: boolean
}

defineProps<{
  files: FileItem[]
  folders: FileItem[]
  selectedFileId: string | null
  isLoading: boolean
}>()

const emit = defineEmits<{
  'select-file': [fileId: string]
  'create-file': [parentFolderId: string | null, name: string]
  'create-folder': [parentFolderId: string | null, name: string]
  'rename': [id: string, newName: string, type: 'file' | 'folder']
  'delete': [id: string, type: 'file' | 'folder']
  'move': [id: string, newParentId: string | null, type: 'file' | 'folder']
}>()

const expandedFolders = ref<Set<string>>(new Set())
const renamingId = ref<string | null>(null)

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  targetId: '',
  targetType: 'file' as 'file' | 'folder'
})

const contextMenuItems = computed<ContextMenuItem[]>(() => {
  if (contextMenu.value.targetType === 'file') {
    return [
      { id: 'rename', label: 'Rename', icon: 'i-heroicons-pencil' },
      { id: 'delete', label: 'Delete', icon: 'i-heroicons-trash', dangerous: true }
    ]
  } else {
    return [
      { id: 'new-file', label: 'New File', icon: 'i-heroicons-document-plus' },
      { id: 'new-folder', label: 'New Folder', icon: 'i-heroicons-folder-plus' },
      { id: 'rename', label: 'Rename', icon: 'i-heroicons-pencil' },
      { id: 'delete', label: 'Delete', icon: 'i-heroicons-trash', dangerous: true }
    ]
  }
})

const rootFolders = computed(() =>
  props.folders.filter(f => !f.parentFolderId)
)

const rootFiles = computed(() =>
  props.files.filter(f => !f.parentFolderId)
)

const toggleFolder = (folderId: string) => {
  if (expandedFolders.value.has(folderId)) {
    expandedFolders.value.delete(folderId)
  } else {
    expandedFolders.value.add(folderId)
  }
}

const createFileInRoot = async () => {
  const name = prompt('File name:')
  if (name) {
    emit('create-file', null, name)
  }
}

const createFolderInRoot = async () => {
  const name = prompt('Folder name:')
  if (name) {
    emit('create-folder', null, name)
  }
}

const onCreateFile = (parentFolderId: string) => {
  const name = prompt('File name:')
  if (name) {
    emit('create-file', parentFolderId, name)
  }
}

const onCreateFolder = (parentFolderId: string) => {
  const name = prompt('Folder name:')
  if (name) {
    emit('create-folder', parentFolderId, name)
  }
}

const onRename = (id: string, newName: string, type: 'file' | 'folder') => {
  emit('rename', id, newName, type)
  renamingId.value = null
}

const onDelete = async (id: string, type: 'file' | 'folder') => {
  const confirmed = confirm(`Delete this ${type}?`)
  if (confirmed) {
    emit('delete', id, type)
  }
}

const onMove = (id: string, newParentId: string | null, type: 'file' | 'folder') => {
  emit('move', id, newParentId, type)
}

const handleContextMenu = (event: {
  id: string
  type: 'file' | 'folder'
  x: number
  y: number
}) => {
  contextMenu.value = {
    visible: true,
    x: event.x,
    y: event.y,
    targetId: event.id,
    targetType: event.type
  }
}

const hideContextMenu = () => {
  contextMenu.value.visible = false
}

const handleContextMenuSelect = (item: ContextMenuItem) => {
  const { targetId, targetType } = contextMenu.value

  switch (item.id) {
    case 'rename':
      renamingId.value = targetId
      break
    case 'delete':
      onDelete(targetId, targetType)
      break
    case 'new-file':
      onCreateFile(targetId)
      break
    case 'new-folder':
      onCreateFolder(targetId)
      break
  }
}
</script>
