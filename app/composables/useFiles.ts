import { ref } from 'vue'

const files = ref([])
const folders = ref([])
const isLoading = ref(false)

export const useFiles = () => {
  const fetchWorkspace = async (workspaceId: string) => {
    try {
      isLoading.value = true
      const { data, error } = await $fetch(`/api/workspaces/${workspaceId}`)

      if (error) {
        throw new Error(error.message)
      }

      files.value = data.files || []
      folders.value = data.folders || []
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
      isLoading.value = true
      const file = await $fetch('/api/files', {
        method: 'POST',
        body: {
          workspaceId,
          name,
          folderId
        }
      })

      files.value.push(file)
      return file
    } catch (err) {
      console.error('Create file error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const updateFile = async (fileId: string, content: string) => {
    try {
      const file = await $fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        body: { content }
      })

      const index = files.value.findIndex((f) => f.id === fileId)
      if (index >= 0) {
        files.value[index] = file
      }

      return file
    } catch (err) {
      console.error('Update file error:', err)
      throw err
    }
  }

  const deleteFile = async (fileId: string) => {
    try {
      await $fetch(`/api/files/${fileId}`, {
        method: 'DELETE'
      })

      files.value = files.value.filter((f) => f.id !== fileId)
    } catch (err) {
      console.error('Delete file error:', err)
      throw err
    }
  }

  const renameFile = async (fileId: string, newName: string) => {
    try {
      const file = await $fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        body: { name: newName }
      })

      const index = files.value.findIndex((f) => f.id === fileId)
      if (index >= 0) {
        files.value[index] = file
      }

      return file
    } catch (err) {
      console.error('Rename file error:', err)
      throw err
    }
  }

  const moveFile = async (fileId: string, newFolderId: string | null) => {
    try {
      const file = await $fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        body: { folderId: newFolderId }
      })

      const index = files.value.findIndex((f) => f.id === fileId)
      if (index >= 0) {
        files.value[index] = file
      }

      return file
    } catch (err) {
      console.error('Move file error:', err)
      throw err
    }
  }

  const createFolder = async (workspaceId: string, name: string, parentFolderId?: string) => {
    try {
      isLoading.value = true
      const folder = await $fetch('/api/folders', {
        method: 'POST',
        body: {
          workspaceId,
          name,
          parentFolderId
        }
      })

      folders.value.push(folder)
      return folder
    } catch (err) {
      console.error('Create folder error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const renameFolder = async (folderId: string, newName: string) => {
    try {
      const folder = await $fetch(`/api/folders/${folderId}`, {
        method: 'PATCH',
        body: { name: newName }
      })

      const index = folders.value.findIndex((f) => f.id === folderId)
      if (index >= 0) {
        folders.value[index] = folder
      }

      return folder
    } catch (err) {
      console.error('Rename folder error:', err)
      throw err
    }
  }

  const moveFolder = async (folderId: string, newParentId: string | null) => {
    try {
      const folder = await $fetch(`/api/folders/${folderId}`, {
        method: 'PATCH',
        body: { parentFolderId: newParentId }
      })

      const index = folders.value.findIndex((f) => f.id === folderId)
      if (index >= 0) {
        folders.value[index] = folder
      }

      return folder
    } catch (err) {
      console.error('Move folder error:', err)
      throw err
    }
  }

  const deleteFolder = async (folderId: string) => {
    try {
      await $fetch(`/api/folders/${folderId}`, {
        method: 'DELETE'
      })

      folders.value = folders.value.filter((f) => f.id !== folderId)
    } catch (err) {
      console.error('Delete folder error:', err)
      throw err
    }
  }

  return {
    files: readonly(files),
    folders: readonly(folders),
    isLoading: readonly(isLoading),
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
