/**
 * Workspace UI state management
 * Handles file selection, folder expansion, context menu, renaming, etc
 */

export interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  targetId: string | null
  targetType: 'file' | 'folder' | null
}

export interface Breadcrumb {
  id: string
  name: string
  type: 'workspace' | 'folder'
}

export const useWorkspaceUI = () => {
  const selectedFileId = ref<string | null>(null)
  const expandedFolderIds = ref<Set<string>>(new Set())
  const renamingId = ref<string | null>(null)
  const renamingType = ref<'file' | 'folder' | null>(null)
  const renamingValue = ref('')

  const contextMenu = ref<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetId: null,
    targetType: null
  })

  // Select a file
  const selectFile = (fileId: string | null) => {
    selectedFileId.value = fileId
  }

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    if (expandedFolderIds.value.has(folderId)) {
      expandedFolderIds.value.delete(folderId)
    } else {
      expandedFolderIds.value.add(folderId)
    }
  }

  const isFolderExpanded = (folderId: string): boolean => {
    return expandedFolderIds.value.has(folderId)
  }

  // Renaming
  const startRenaming = (id: string, type: 'file' | 'folder', currentName: string) => {
    renamingId.value = id
    renamingType.value = type
    renamingValue.value = currentName
  }

  const cancelRenaming = () => {
    renamingId.value = null
    renamingType.value = null
    renamingValue.value = ''
  }

  const isRenaming = (id: string): boolean => {
    return renamingId.value === id
  }

  // Context menu
  const showContextMenu = (
    e: MouseEvent,
    targetId: string,
    targetType: 'file' | 'folder'
  ) => {
    e.preventDefault()
    e.stopPropagation()

    contextMenu.value = {
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetId,
      targetType
    }
  }

  const hideContextMenu = () => {
    contextMenu.value = {
      visible: false,
      x: 0,
      y: 0,
      targetId: null,
      targetType: null
    }
  }

  // Close context menu on click outside
  const closeContextMenuOnClickOutside = () => {
    if (contextMenu.value.visible) {
      hideContextMenu()
    }
  }

  return {
    // State
    selectedFileId: readonly(selectedFileId),
    expandedFolderIds: readonly(expandedFolderIds),
    renamingId: readonly(renamingId),
    renamingType: readonly(renamingType),
    renamingValue,
    contextMenu: readonly(contextMenu),

    // Methods
    selectFile,
    toggleFolder,
    isFolderExpanded,
    startRenaming,
    cancelRenaming,
    isRenaming,
    showContextMenu,
    hideContextMenu,
    closeContextMenuOnClickOutside
  }
}
