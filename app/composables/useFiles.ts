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

  return {
    files: readonly(files),
    folders: readonly(folders),
    isLoading: readonly(isLoading),
    fetchWorkspace,
    createFile,
    updateFile,
    deleteFile,
    createFolder
  }
}
