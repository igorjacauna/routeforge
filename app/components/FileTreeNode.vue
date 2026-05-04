<template>
  <div class="tree-node">
    <!-- Folder Header -->
    <div
      v-if="isFolder"
      class="folder-header flex items-center gap-1.5 pr-2 py-1 rounded-md hover:bg-elevated cursor-pointer group transition-all"
      :style="{ paddingLeft: depth * 14 + 6 + 'px' }"
      :class="{
        'bg-primary/10 ring-1 ring-primary/30': isDragOver,
        'opacity-60 pointer-events-none': isPending
      }"
      :draggable="!isPending"
      @click="toggleFolder"
      @contextmenu="showContextMenu"
      @dragstart="dragStart"
      @dragover="dragOver"
      @drop="drop"
      @dragleave="dragLeave"
    >
      <UIcon
        :name="isExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
        class="size-3.5 shrink-0 text-muted"
      />
      <UIcon
        :name="isExpanded ? 'i-lucide-folder-open' : 'i-lucide-folder'"
        class="size-4 shrink-0 text-amber-500"
      />

      <input
        v-if="renaming"
        ref="renameInput"
        v-model="newName"
        class="flex-1 min-w-0 px-1 bg-default border border-primary/60 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        @blur="finishRename"
        @keyup.enter="finishRename"
        @keyup.escape="cancelRename"
        @click.stop
      />
      <span v-else class="flex-1 text-sm text-default truncate">
        {{ item.name }}
      </span>

      <UIcon
        v-if="isPending"
        name="i-lucide-loader-2"
        class="size-3.5 shrink-0 text-muted animate-spin"
      />

      <div
        v-else
        class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 shrink-0"
      >
        <UButton
          icon="i-lucide-file-plus"
          size="xs"
          variant="ghost"
          color="neutral"
          @click.stop="$emit('create-file', item.id)"
        />
        <UButton
          icon="i-lucide-folder-plus"
          size="xs"
          variant="ghost"
          color="neutral"
          @click.stop="$emit('create-folder', item.id)"
        />
      </div>
    </div>

    <!-- File Item -->
    <div
      v-else
      class="file-item flex items-center gap-1.5 pr-2 py-1 rounded-md hover:bg-elevated cursor-pointer transition-all"
      :style="{ paddingLeft: depth * 14 + 22 + 'px' }"
      :class="{
        'bg-primary/10 text-primary': isSelected,
        'opacity-60 pointer-events-none': isPending
      }"
      :draggable="!isPending"
      @click="selectFile"
      @contextmenu="showContextMenu"
      @dragstart="dragStart"
    >
      <UIcon
        name="i-lucide-file-code-2"
        class="size-4 shrink-0"
        :class="isSelected ? 'text-primary' : 'text-muted'"
      />

      <input
        v-if="renaming"
        ref="renameInput"
        v-model="newName"
        class="flex-1 min-w-0 px-1 bg-default border border-primary/60 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        @blur="finishRename"
        @keyup.enter="finishRename"
        @keyup.escape="cancelRename"
        @click.stop
      />
      <span v-else class="flex-1 text-sm truncate">
        {{ item.name }}
      </span>

      <UIcon
        v-if="isPending"
        name="i-lucide-loader-2"
        class="size-3.5 shrink-0 text-muted animate-spin"
      />
    </div>

    <!-- Children (Folders recursively, files flat) -->
    <div v-if="isFolder && isExpanded">
      <!-- Nested folders -->
      <FileTreeNode
        v-for="folder in childFolders"
        :key="folder.id"
        :item="folder"
        type="folder"
        :depth="depth + 1"
        :selected-file-id="selectedFileId"
        :expanded-folders="expandedFolders"
        :rename-id="renameId"
        :all-files="allFiles"
        :all-folders="allFolders"
        :pending-items="pendingItems"
        @select-file="(...args) => $emit('select-file', ...args)"
        @create-file="(...args) => $emit('create-file', ...args)"
        @create-folder="(...args) => $emit('create-folder', ...args)"
        @rename="(...args) => $emit('rename', ...args)"
        @delete="(...args) => $emit('delete', ...args)"
        @move="(...args) => $emit('move', ...args)"
        @toggle-folder="(...args) => $emit('toggle-folder', ...args)"
        @context-menu="(...args) => $emit('context-menu', ...args)"
      />

      <!-- Files in this folder -->
      <FileTreeNode
        v-for="file in childFiles"
        :key="file.id"
        :item="file"
        type="file"
        :depth="depth + 1"
        :selected-file-id="selectedFileId"
        :expanded-folders="expandedFolders"
        :rename-id="renameId"
        :all-files="allFiles"
        :all-folders="allFolders"
        :pending-items="pendingItems"
        @select-file="(...args) => $emit('select-file', ...args)"
        @create-file="(...args) => $emit('create-file', ...args)"
        @create-folder="(...args) => $emit('create-folder', ...args)"
        @rename="(...args) => $emit('rename', ...args)"
        @delete="(...args) => $emit('delete', ...args)"
        @move="(...args) => $emit('move', ...args)"
        @toggle-folder="(...args) => $emit('toggle-folder', ...args)"
        @context-menu="(...args) => $emit('context-menu', ...args)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

interface TreeItem {
  id: string
  name: string
  parentFolderId?: string | null
  content?: string
}

const props = defineProps<{
  item: TreeItem
  type: 'file' | 'folder'
  depth: number
  selectedFileId: string | null
  expandedFolders: Set<string>
  renameId: string | null
  allFiles?: TreeItem[]
  allFolders?: TreeItem[]
  pendingItems?: Set<string>
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

const isFolder = computed(() => props.type === 'folder')
const isFile = computed(() => props.type === 'file')
const isSelected = computed(() => isFile.value && props.selectedFileId === props.item.id)
const isExpanded = computed(() => isFolder.value && props.expandedFolders.has(props.item.id))
const isPending = computed(() => props.pendingItems?.has(props.item.id) ?? false)

const childFolders = computed(() => {
  if (!isFolder.value || !props.allFolders) return []
  return props.allFolders.filter(f => f.parentFolderId === props.item.id)
})

const childFiles = computed(() => {
  if (!isFolder.value || !props.allFiles) return []
  return props.allFiles.filter(f => f.parentFolderId === props.item.id)
})

watch(() => props.renameId, (newId) => {
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
  if (isFolder.value && !isPending.value) {
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
  e.stopPropagation()
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
