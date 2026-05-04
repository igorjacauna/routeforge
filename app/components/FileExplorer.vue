<template>
  <div
    class="flex flex-col h-full w-full min-h-0"
    @dragover.prevent="rootDragOver = true"
    @dragleave="rootDragOver = false"
    @drop.prevent="handleRootDrop"
    :class="{ 'bg-primary/5': rootDragOver }"
  >
    <!-- Header -->
    <div class="flex items-center justify-between gap-2 h-12 px-4 border-b border-default shrink-0">
      <span class="text-xs font-semibold uppercase tracking-wider text-muted">
        Files
      </span>
      <div class="flex items-center gap-1">
        <UTooltip text="New file">
          <UButton
            icon="i-lucide-file-plus"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="createFileInRoot"
          />
        </UTooltip>
        <UTooltip text="New folder">
          <UButton
            icon="i-lucide-folder-plus"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="createFolderInRoot"
          />
        </UTooltip>
      </div>
    </div>

    <!-- Tree View -->
    <div v-if="isLoading" class="p-3 space-y-2">
      <div v-for="i in 5" :key="i" class="flex items-center gap-2">
        <USkeleton class="h-4 w-4 rounded" />
        <USkeleton class="h-4 rounded" :style="`width: ${60 + (i * 13) % 40}%`" />
      </div>
    </div>

    <div v-else class="flex-1 overflow-y-auto min-h-0">
      <!-- Root files and folders -->
      <div class="p-2">
        <FileTreeNode
          v-for="folder in rootFolders"
          :key="folder.id"
          :item="folder"
          type="folder"
          :depth="0"
          :selected-file-id="selectedFileId"
          :expanded-folders="expandedFolders"
          :rename-id="renamingId"
          :all-files="files"
          :all-folders="folders"
          :pending-items="pendingItems"
          @select-file="(id) => $emit('select-file', id)"
          @create-file="onCreateFile"
          @create-folder="onCreateFolder"
          @rename="onRename"
          @delete="onDelete"
          @move="onMove"
          @toggle-folder="toggleFolder"
          @context-menu="handleContextMenu"
        />

        <FileTreeNode
          v-for="file in rootFiles"
          :key="file.id"
          :item="file"
          type="file"
          :depth="0"
          :selected-file-id="selectedFileId"
          :expanded-folders="expandedFolders"
          :rename-id="renamingId"
          :all-files="files"
          :all-folders="folders"
          :pending-items="pendingItems"
          @select-file="(id) => $emit('select-file', id)"
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
          class="px-4 py-8 text-center"
        >
          <UIcon name="i-lucide-folder-open" class="size-8 text-muted/60 mx-auto mb-2" />
          <p class="text-sm font-medium text-default">No files yet</p>
          <p class="text-xs text-muted mt-1">Use the buttons above to create one.</p>
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

    <!-- Create File/Folder Modal -->
    <UModal
      v-model:open="createModal.isOpen"
      :title="createModal.type === 'file' ? 'Create File' : 'Create Folder'"
    >
      <template #body>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ createModal.type === 'file' ? 'File name' : 'Folder name' }}
          </label>
          <UInput
            v-model="createModal.name"
            :placeholder="createModal.type === 'file' ? 'my-file.txt' : 'my-folder'"
            @keyup.enter="confirmCreate"
            @keyup.escape="cancelCreate"
          />
        </div>
      </template>

      <template #footer>
        <div class="flex gap-2 justify-end">
          <UButton color="neutral" variant="outline" @click="cancelCreate">
            Cancel
          </UButton>
          <UButton @click="confirmCreate">
            Create
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal
      v-model:open="deleteModal.isOpen"
      :title="`Delete ${deleteModal.type}?`"
    >
      <template #body>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Are you sure you want to delete this {{ deleteModal.type }}? This action cannot be undone.
        </p>
      </template>

      <template #footer>
        <div class="flex gap-2 justify-end">
          <UButton color="neutral" variant="outline" @click="cancelDelete">
            Cancel
          </UButton>
          <UButton color="error" @click="confirmDelete">
            Delete
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

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

const { files, folders, selectedFileId, isLoading, pendingItems } = defineProps<{
  files: FileItem[]
  folders: FileItem[]
  selectedFileId: string | null
  isLoading: boolean
  pendingItems?: Set<string>
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
const rootDragOver = ref(false)

const handleRootDrop = (e: DragEvent) => {
  rootDragOver.value = false
  if (!e.dataTransfer) return
  const itemId = e.dataTransfer.getData('itemId')
  const itemType = e.dataTransfer.getData('itemType') as 'file' | 'folder'
  if (itemId && itemType) {
    emit('move', itemId, null, itemType)
  }
}

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  targetId: '',
  targetType: 'file' as 'file' | 'folder'
})

const createModal = ref({
  isOpen: false,
  name: '',
  type: 'file' as 'file' | 'folder',
  parentFolderId: null as string | null
})

const deleteModal = ref({
  isOpen: false,
  type: 'file' as 'file' | 'folder',
  targetId: ''
})

const contextMenuItems = computed<ContextMenuItem[]>(() => {
  if (contextMenu.value.targetType === 'file') {
    return [
      { id: 'rename', label: 'Rename', icon: 'i-lucide-pencil' },
      { id: 'delete', label: 'Delete', icon: 'i-lucide-trash-2', dangerous: true }
    ]
  } else {
    return [
      { id: 'new-file', label: 'New File', icon: 'i-lucide-file-plus' },
      { id: 'new-folder', label: 'New Folder', icon: 'i-lucide-folder-plus' },
      { id: 'rename', label: 'Rename', icon: 'i-lucide-pencil' },
      { id: 'delete', label: 'Delete', icon: 'i-lucide-trash-2', dangerous: true }
    ]
  }
})

const rootFolders = computed(() =>
  folders.filter(f => !f.parentFolderId)
)

const rootFiles = computed(() =>
  files.filter(f => !f.parentFolderId)
)

const toggleFolder = (folderId: string) => {
  if (expandedFolders.value.has(folderId)) {
    expandedFolders.value.delete(folderId)
  } else {
    expandedFolders.value.add(folderId)
  }
}

const createFileInRoot = () => {
  createModal.value = {
    isOpen: true,
    name: '',
    type: 'file',
    parentFolderId: null
  }
}

const createFolderInRoot = () => {
  createModal.value = {
    isOpen: true,
    name: '',
    type: 'folder',
    parentFolderId: null
  }
}

const onCreateFile = (parentFolderId: string) => {
  createModal.value = {
    isOpen: true,
    name: '',
    type: 'file',
    parentFolderId
  }
}

const onCreateFolder = (parentFolderId: string) => {
  createModal.value = {
    isOpen: true,
    name: '',
    type: 'folder',
    parentFolderId
  }
}

const confirmCreate = () => {
  const { name, type, parentFolderId } = createModal.value
  if (name.trim()) {
    if (type === 'file') {
      emit('create-file', parentFolderId, name)
    } else {
      emit('create-folder', parentFolderId, name)
    }
    cancelCreate()
  }
}

const cancelCreate = () => {
  createModal.value = {
    isOpen: false,
    name: '',
    type: 'file',
    parentFolderId: null
  }
}

const onRename = (id: string, newName: string, type: 'file' | 'folder') => {
  emit('rename', id, newName, type)
  renamingId.value = null
}

const onDelete = (id: string, type: 'file' | 'folder') => {
  deleteModal.value = {
    isOpen: true,
    type,
    targetId: id
  }
}

const confirmDelete = () => {
  const { targetId, type } = deleteModal.value
  emit('delete', targetId, type)
  cancelDelete()
}

const cancelDelete = () => {
  deleteModal.value = {
    isOpen: false,
    type: 'file',
    targetId: ''
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
