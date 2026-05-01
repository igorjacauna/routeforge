<template>
  <div class="tree-node">
    <!-- Folder Header -->
    <div
      v-if="isFolder"
      class="folder-header flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer group"
      :style="{ paddingLeft: depth * 16 + 8 + 'px' }"
      @click="toggleFolder"
      @contextmenu="showContextMenu"
      draggable="true"
      @dragstart="dragStart"
      @dragover="dragOver"
      @drop="drop"
      @dragleave="dragLeave"
      :class="{ 'bg-blue-50 dark:bg-blue-900': isDragOver }"
    >
      <UIcon
        :name="isExpanded ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
        class="w-4 h-4 flex-shrink-0 text-gray-600 dark:text-gray-400"
      />
      <UIcon name="i-heroicons-folder" class="w-4 h-4 flex-shrink-0 text-yellow-500" />

      <input
        v-if="renaming"
        ref="renameInput"
        v-model="newName"
        class="flex-1 px-1 bg-white dark:bg-gray-700 border border-blue-400 rounded text-sm"
        @blur="finishRename"
        @keyup.enter="finishRename"
        @keyup.escape="cancelRename"
        @click.stop
      />
      <span v-else class="flex-1 text-sm text-gray-900 dark:text-gray-100">
        {{ item.name }}
      </span>

      <div class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <UButton
          icon="i-heroicons-plus"
          size="xs"
          variant="ghost"
          @click.stop="$emit('create-file', item.id)"
        />
        <UButton
          icon="i-heroicons-folder-plus"
          size="xs"
          variant="ghost"
          @click.stop="$emit('create-folder', item.id)"
        />
      </div>
    </div>

    <!-- File Item -->
    <div
      v-else
      class="file-item flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
      :style="{ paddingLeft: depth * 16 + 8 + 'px' }"
      @click="selectFile"
      @contextmenu="showContextMenu"
      draggable="true"
      @dragstart="dragStart"
      :class="{
        'bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100': isSelected
      }"
    >
      <UIcon name="i-heroicons-document" class="w-4 h-4 flex-shrink-0 text-gray-400" />

      <input
        v-if="renaming"
        ref="renameInput"
        v-model="newName"
        class="flex-1 px-1 bg-white dark:bg-gray-700 border border-blue-400 rounded text-sm"
        @blur="finishRename"
        @keyup.enter="finishRename"
        @keyup.escape="cancelRename"
        @click.stop
      />
      <span v-else class="flex-1 text-sm truncate">
        {{ item.name }}
      </span>
    </div>

    <!-- Children (Folders recursively, files flat) -->
    <div v-if="isFolder && isExpanded">
      <!-- Nested folders -->
      <FileTreeNode
        v-for="folder in childFolders"
        :key="folder.id"
        :item="folder"
        :depth="depth + 1"
        :selected-file-id="selectedFileId"
        :expanded-folders="expandedFolders"
        :renaming-id="renamingId"
        @select-file="$emit('select-file', $event)"
        @create-file="$emit('create-file', $event)"
        @create-folder="$emit('create-folder', $event)"
        @rename="$emit('rename', $event)"
        @delete="$emit('delete', $event)"
        @move="$emit('move', $event)"
        @toggle-folder="$emit('toggle-folder', $event)"
        @context-menu="$emit('context-menu', $event)"
      />

      <!-- Files in this folder -->
      <FileTreeNode
        v-for="file in childFiles"
        :key="file.id"
        :item="file"
        :depth="depth + 1"
        :selected-file-id="selectedFileId"
        :expanded-folders="expandedFolders"
        :renaming-id="renamingId"
        @select-file="$emit('select-file', $event)"
        @create-file="$emit('create-file', $event)"
        @create-folder="$emit('create-folder', $event)"
        @rename="$emit('rename', $event)"
        @delete="$emit('delete', $event)"
        @move="$emit('move', $event)"
        @toggle-folder="$emit('toggle-folder', $event)"
        @context-menu="$emit('context-menu', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface TreeItem {
  id: string
  name: string
  parentFolderId?: string | null
  content?: string
}

defineProps<{
  item: TreeItem
  depth: number
  selectedFileId: string | null
  expandedFolders: Set<string>
  renameId: string | null
  allFiles?: TreeItem[]
  allFolders?: TreeItem[]
}>()

const emit = defineEmits<{
  'select-file': [fileId: string]
  'create-file': [folderId: string]
  'create-folder': [folderId: string]
  'rename': [id: string, newName: string, type: 'file' | 'folder']
  'delete': [id: string, type: 'file' | 'folder']
  'move': [id: string, newParentId: string | null, type: 'file' | 'folder']
  'toggle-folder': [folderId: string]
  'context-menu': [event: {id: string, type: 'file' | 'folder', x: number, y: number}]
}>()

const renameInput = ref<HTMLInputElement | null>(null)
const renaming = ref(false)
const newName = ref('')
const isDragOver = ref(false)

const isFolder = computed(() => !('content' in props.item))
const isFile = computed(() => 'content' in props.item)
const isSelected = computed(() => isFile.value && props.selectedFileId === props.item.id)
const isExpanded = computed(() => isFolder.value && props.expandedFolders.has(props.item.id))

const childFolders = computed(() => {
  if (!isFolder.value || !props.allFolders) return []
  return props.allFolders.filter(f => f.parentFolderId === props.item.id)
})

const childFiles = computed(() => {
  if (!isFolder.value || !props.allFiles) return []
  return props.allFiles.filter(f => f.parentFolderId === props.item.id)
})

watch(() => props.renamingId, (newId) => {
  if (newId === props.item.id && isFolder.value) {
    renaming.value = true
    newName.value = props.item.name
    nextTick(() => renameInput.value?.focus())
  } else {
    renaming.value = false
  }
})

const selectFile = () => {
  if (isFile.value) {
    emit('select-file', props.item.id)
  }
}

const toggleFolder = () => {
  if (isFolder.value) {
    emit('toggle-folder', props.item.id)
  }
}

const showContextMenu = (e: MouseEvent) => {
  emit('context-menu', {
    id: props.item.id,
    type: isFolder.value ? 'folder' : 'file',
    x: e.clientX,
    y: e.clientY
  })
}

const finishRename = () => {
  if (newName.value.trim() && newName.value !== props.item.name) {
    emit('rename', props.item.id, newName.value.trim(), isFolder.value ? 'folder' : 'file')
  }
  renaming.value = false
}

const cancelRename = () => {
  renaming.value = false
}

const dragStart = (e: DragEvent) => {
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('itemId', props.item.id)
    e.dataTransfer.setData('itemType', isFolder.value ? 'folder' : 'file')
  }
}

const dragOver = (e: DragEvent) => {
  if (isFolder.value) {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move'
    }
    isDragOver.value = true
  }
}

const dragLeave = () => {
  isDragOver.value = false
}

const drop = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false

  if (isFolder.value && e.dataTransfer) {
    const itemId = e.dataTransfer.getData('itemId')
    const itemType = e.dataTransfer.getData('itemType') as 'file' | 'folder'

    if (itemId && itemType && itemId !== props.item.id) {
      emit('move', itemId, props.item.id, itemType)
    }
  }
}
</script>

<style scoped>
.tree-node {
  user-select: none;
}
</style>
