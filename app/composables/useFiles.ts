import { ref } from 'vue'

interface FileItem {
  id: string
  name: string
  workspace_id: string
  folder_id: string | null
  content?: string
  parentFolderId: string | null
  [key: string]: unknown
}

interface FolderItem {
  id: string
  name: string
  workspace_id: string
  parent_folder_id: string | null
  parentFolderId: string | null
  [key: string]: unknown
}

const files = ref<FileItem[]>([])
const folders = ref<FolderItem[]>([])
const isLoading = ref(false)
const pendingItems = ref<Set<string>>(new Set())

const markPending = (id: string) => {
  pendingItems.value = new Set(pendingItems.value).add(id)
}

const clearPending = (id: string) => {
  const next = new Set(pendingItems.value)
  next.delete(id)
  pendingItems.value = next
}

const mapFile = (f: any): FileItem => ({ ...f, parentFolderId: f.folder_id ?? null })
const mapFolder = (f: any): FolderItem => ({ ...f, parentFolderId: f.parent_folder_id ?? null })

const replaceFile = (file: FileItem) => {
  const idx = files.value.findIndex((f) => f.id === file.id)
  if (idx >= 0) {
    files.value.splice(idx, 1, file)
  } else {
    files.value.push(file)
  }
}

const replaceFolder = (folder: FolderItem) => {
  const idx = folders.value.findIndex((f) => f.id === folder.id)
  if (idx >= 0) {
    folders.value.splice(idx, 1, folder)
  } else {
    folders.value.push(folder)
  }
}

const patchFileLocal = (fileId: string, patch: Partial<FileItem>) => {
  const idx = files.value.findIndex((f) => f.id === fileId)
  if (idx >= 0) {
    files.value.splice(idx, 1, { ...files.value[idx]!, ...patch })
  }
}

const patchFolderLocal = (folderId: string, patch: Partial<FolderItem>) => {
  const idx = folders.value.findIndex((f) => f.id === folderId)
  if (idx >= 0) {
    folders.value.splice(idx, 1, { ...folders.value[idx]!, ...patch })
  }
}

export const useFiles = () => {
  const fetchWorkspace = async (workspaceId: string) => {
    try {
      isLoading.value = true
      const data: any = await $fetch(`/api/workspaces/${workspaceId}`)

      files.value = (data?.files || []).map(mapFile)
      folders.value = (data?.folders || []).map(mapFolder)
      return data
    } catch (err) {
      console.error('Fetch workspace error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const createFile = async (workspaceId: string, name: string, folderId?: string) => {
    try {
      const file: any = await $fetch('/api/files', {
        method: 'POST',
        body: { workspaceId, name, folderId }
      })
      const mapped = mapFile(file)
      files.value.push(mapped)
      return mapped
    } catch (err) {
      console.error('Create file error:', err)
      throw err
    }
  }

  const updateFile = async (fileId: string, content: string) => {
    const file: any = await $fetch(`/api/files/${fileId}`, {
      method: 'PATCH',
      body: { content }
    })
    replaceFile(mapFile(file))
    return file
  }

  const deleteFile = async (fileId: string) => {
    await $fetch(`/api/files/${fileId}`, { method: 'DELETE' })
    files.value = files.value.filter((f) => f.id !== fileId)
  }

  const renameFile = async (fileId: string, newName: string) => {
    const file: any = await $fetch(`/api/files/${fileId}`, {
      method: 'PATCH',
      body: { name: newName }
    })
    replaceFile(mapFile(file))
    return file
  }

  const moveFile = async (fileId: string, newFolderId: string | null) => {
    const idx = files.value.findIndex((f) => f.id === fileId)
    if (idx < 0) return
    const previous = files.value[idx]!
    if (previous.parentFolderId === newFolderId) return

    markPending(fileId)
    patchFileLocal(fileId, { parentFolderId: newFolderId, folder_id: newFolderId })

    try {
      const file: any = await $fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        body: { folderId: newFolderId }
      })
      replaceFile(mapFile(file))
      return file
    } catch (err) {
      replaceFile(previous)
      throw err
    } finally {
      clearPending(fileId)
    }
  }

  const createFolder = async (workspaceId: string, name: string, parentFolderId?: string) => {
    try {
      const folder: any = await $fetch('/api/folders', {
        method: 'POST',
        body: { workspaceId, name, parentFolderId }
      })
      const mapped = mapFolder(folder)
      folders.value.push(mapped)
      return mapped
    } catch (err) {
      console.error('Create folder error:', err)
      throw err
    }
  }

  const renameFolder = async (folderId: string, newName: string) => {
    const folder: any = await $fetch(`/api/folders/${folderId}`, {
      method: 'PATCH',
      body: { name: newName }
    })
    replaceFolder(mapFolder(folder))
    return folder
  }

  const moveFolder = async (folderId: string, newParentId: string | null) => {
    const idx = folders.value.findIndex((f) => f.id === folderId)
    if (idx < 0) return
    const previous = folders.value[idx]!
    if (previous.parentFolderId === newParentId) return

    markPending(folderId)
    patchFolderLocal(folderId, { parentFolderId: newParentId, parent_folder_id: newParentId })

    try {
      const folder: any = await $fetch(`/api/folders/${folderId}`, {
        method: 'PATCH',
        body: { parentFolderId: newParentId }
      })
      replaceFolder(mapFolder(folder))
      return folder
    } catch (err) {
      replaceFolder(previous)
      throw err
    } finally {
      clearPending(folderId)
    }
  }

  const deleteFolder = async (folderId: string) => {
    await $fetch(`/api/folders/${folderId}`, { method: 'DELETE' })
    folders.value = folders.value.filter((f) => f.id !== folderId)
    files.value = files.value.filter((f) => f.parentFolderId !== folderId)
  }

  const isPending = (id: string) => pendingItems.value.has(id)

  return {
    files,
    folders,
    isLoading,
    pendingItems,
    isPending,
    fetchWorkspace,
    createFile,
    updateFile,
    deleteFile,
    renameFile,
    moveFile,
    createFolder,
    renameFolder,
    moveFolder,
    deleteFolder
  }
}
