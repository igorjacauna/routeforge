<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

interface WorkspaceItem {
  id: string
  name: string
  isOwner: boolean
}

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

const { selectedFileId, selectFile } = useWorkspaceUI()
const toast = useToast()

const workspace = ref<WorkspaceItem | null>(null)
const allWorkspaces = ref<WorkspaceItem[]>([])
const isLoadingWorkspace = ref(true)
const isCreatingWorkspace = ref(false)

const breadcrumbs = ref<Array<{ id: string; name: string }>>([])
const editorSaveState = ref<'idle' | 'saving' | 'saved'>('idle')
const shareModalOpen = ref(false)
const shareContext = ref<{ folderId?: string; folderName?: string }>({})

const promptModal = ref({
  open: false,
  title: '',
  description: undefined as string | undefined,
  placeholder: '',
  confirmLabel: 'Confirmar',
  initialValue: '',
  onConfirm: (_value: string) => {},
})

useSeoMeta({ title: 'Workspace - RouteForge' })

const currentFile = computed(() => {
  if (!selectedFileId.value) return null
  return files.value.find((f) => f.id === selectedFileId.value)
})

const workspaceMenuItems = computed(() => {
  const workspaceItems = allWorkspaces.value.map(w => ({
    label: w.name,
    icon: w.isOwner ? 'i-lucide-layers' : 'i-lucide-users',
    checked: w.id === workspace.value?.id,
    onSelect: () => switchWorkspace(w),
  }))

  const actions = [
    {
      label: 'Novo workspace',
      icon: 'i-lucide-plus',
      onSelect: createNewWorkspace,
    },
  ]

  if (workspace.value?.isOwner) {
    actions.unshift({
      label: 'Renomear workspace',
      icon: 'i-lucide-pencil',
      onSelect: renameCurrentWorkspace,
    })
  }

  return [workspaceItems, actions]
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

const switchWorkspace = async (w: WorkspaceItem) => {
  if (w.id === workspace.value?.id) return
  workspace.value = w
  selectFile(null)
  await fetchWorkspace(w.id)
}

const openPrompt = (opts: Omit<typeof promptModal.value, 'open'>) => {
  promptModal.value = { open: true, ...opts }
}

const renameCurrentWorkspace = () => {
  if (!workspace.value?.isOwner) return
  openPrompt({
    title: 'Renomear workspace',
    placeholder: 'Nome do workspace',
    confirmLabel: 'Renomear',
    initialValue: workspace.value.name,
    onConfirm: async (newName) => {
      if (newName === workspace.value?.name) return
      try {
        const updated = await $fetch<{ id: string; name: string }>(`/api/workspaces/${workspace.value!.id}`, {
          method: 'PATCH',
          body: { name: newName },
        })
        workspace.value!.name = updated.name
        const idx = allWorkspaces.value.findIndex(w => w.id === updated.id)
        if (idx >= 0) allWorkspaces.value[idx]!.name = updated.name
        toast.add({ title: 'Workspace renomeado', color: 'success', icon: 'i-lucide-check' })
      } catch {
        toast.add({ title: 'Erro ao renomear workspace', color: 'error', icon: 'i-lucide-alert-triangle' })
      }
    },
  })
}

const createNewWorkspace = () => {
  openPrompt({
    title: 'Novo workspace',
    placeholder: 'Nome do workspace',
    confirmLabel: 'Criar',
    initialValue: '',
    onConfirm: async (name) => {
      isCreatingWorkspace.value = true
      try {
        const created = await $fetch<WorkspaceItem>('/api/workspaces', {
          method: 'POST',
          body: { name },
        })
        allWorkspaces.value.push(created)
        await switchWorkspace(created)
        toast.add({ title: `Workspace "${created.name}" criado`, color: 'success', icon: 'i-lucide-check' })
      } catch {
        toast.add({ title: 'Erro ao criar workspace', color: 'error', icon: 'i-lucide-alert-triangle' })
      } finally {
        isCreatingWorkspace.value = false
      }
    },
  })
}

const handleSelectFile = (fileId: string) => selectFile(fileId)

const handleCreateFile = async (parentFolderId: string | null, name: string) => {
  if (!workspace.value) return
  try {
    const file = await createFile(workspace.value.id, name, parentFolderId || undefined)
    handleSelectFile(file.id)
  } catch (err) {
    console.error('Create file error:', err)
  }
}

const handleCreateFolder = async (parentFolderId: string | null, name: string) => {
  if (!workspace.value) return
  try {
    await createFolder(workspace.value.id, name, parentFolderId || undefined)
  } catch (err) {
    console.error('Create folder error:', err)
  }
}

const handleRename = async (id: string, newName: string, type: 'file' | 'folder') => {
  try {
    if (type === 'file') await renameFile(id, newName)
    else await renameFolder(id, newName)
  } catch (err) {
    console.error('Rename error:', err)
  }
}

const handleDelete = async (id: string, type: 'file' | 'folder') => {
  try {
    if (type === 'file') {
      if (selectedFileId.value === id) selectFile(null)
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
    if (type === 'file') await moveFile(id, newParentId)
    else await moveFolder(id, newParentId)
  } catch (err: any) {
    toast.add({
      title: `Falha ao mover ${type}`,
      description: err?.statusMessage || err?.message || 'Tente novamente.',
      color: 'error',
      icon: 'i-lucide-alert-triangle',
    })
  }
}

const handleBreadcrumbNavigate = () => selectFile(null)

const handleShareFolder = (folderId: string, folderName: string) => {
  shareContext.value = { folderId, folderName }
  shareModalOpen.value = true
}

const handleShareWorkspace = () => {
  shareContext.value = {}
  shareModalOpen.value = true
}

const handleCreateFirstFile = () => {
  openPrompt({
    title: 'Novo arquivo',
    placeholder: 'untitled.route',
    confirmLabel: 'Criar',
    initialValue: '',
    onConfirm: (name) => handleCreateFile(null, name),
  })
}

onMounted(async () => {
  try {
    const [workspaces, ensured] = await Promise.all([
      $fetch<WorkspaceItem[]>('/api/workspaces'),
      $fetch<{ workspace: { id: string; name: string } }>('/api/workspaces/ensure', { method: 'POST' }),
    ])

    allWorkspaces.value = workspaces

    // Seleciona o workspace padrão (o que foi garantido pelo ensure)
    const defaultWs = workspaces.find(w => w.id === ensured.workspace.id)
      ?? { ...ensured.workspace, isOwner: true }

    workspace.value = defaultWs
    await fetchWorkspace(defaultWs.id)
  } catch (err) {
    console.error('Error loading workspace:', err)
  } finally {
    isLoadingWorkspace.value = false
  }
})
</script>

<template>
  <div class="flex flex-1 min-h-0 overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-64 shrink-0 border-r border-default bg-elevated/30 flex flex-col min-h-0">
      <!-- Workspace header -->
      <div class="h-12 px-2 border-b border-default flex items-center gap-1 shrink-0">
        <UDropdownMenu :items="workspaceMenuItems" :content="{ align: 'start', side: 'bottom' }" class="flex-1 min-w-0">
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            class="w-full justify-start gap-2 min-w-0 px-2"
            :loading="isLoadingWorkspace"
          >
            <UIcon name="i-lucide-layers" class="size-4 text-primary shrink-0" />
            <span class="truncate font-medium text-sm">{{ workspace?.name ?? 'Carregando...' }}</span>
            <UIcon name="i-lucide-chevrons-up-down" class="size-3.5 text-muted shrink-0 ml-auto" />
          </UButton>
        </UDropdownMenu>

        <UTooltip v-if="workspace?.isOwner" text="Compartilhar workspace">
          <UButton
            icon="i-lucide-users"
            variant="ghost"
            color="neutral"
            size="xs"
            @click="handleShareWorkspace"
          />
        </UTooltip>
      </div>

      <!-- File Explorer -->
      <FileExplorer
        :files="files"
        :folders="folders"
        :selected-file-id="selectedFileId"
        :is-loading="isLoading || isLoadingWorkspace"
        :pending-items="pendingItems"
        @select-file="handleSelectFile"
        @create-file="handleCreateFile"
        @create-folder="handleCreateFolder"
        @rename="handleRename"
        @delete="handleDelete"
        @move="handleMove"
        @share-folder="handleShareFolder"
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
          <BreadcrumbNav :breadcrumbs="breadcrumbs" @navigate="handleBreadcrumbNavigate" />
          <UIcon name="i-lucide-chevron-right" class="size-4 text-muted shrink-0" />
          <UIcon name="i-lucide-file-code-2" class="size-4 text-primary shrink-0" />
          <span class="font-medium text-sm truncate">{{ currentFile.name }}</span>
        </div>

        <Transition
          enter-active-class="transition-opacity duration-150"
          enter-from-class="opacity-0"
          leave-active-class="transition-opacity duration-150"
          leave-to-class="opacity-0"
          mode="out-in"
        >
          <div v-if="editorSaveState === 'saving'" class="flex items-center gap-1.5 text-xs text-muted">
            <UIcon name="i-lucide-loader-2" class="size-3.5 animate-spin" />
            <span>Salvando...</span>
          </div>
          <div v-else-if="editorSaveState === 'saved'" class="flex items-center gap-1.5 text-xs text-success">
            <UIcon name="i-lucide-check" class="size-3.5" />
            <span>Salvo</span>
          </div>
          <div v-else class="text-xs text-muted/60">Todas as alterações salvas</div>
        </Transition>
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

        <div v-else class="flex-1 flex items-center justify-center bg-elevated/20">
          <div class="text-center max-w-sm px-6">
            <div class="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UIcon name="i-lucide-file-plus-2" class="size-7" />
            </div>
            <h3 class="text-base font-semibold mb-1">Nenhum arquivo selecionado</h3>
            <p class="text-sm text-muted mb-5">
              Selecione um arquivo na barra lateral ou crie um novo.
            </p>
            <UButton icon="i-lucide-plus" color="primary" size="sm" @click="handleCreateFirstFile">
              Novo arquivo
            </UButton>
          </div>
        </div>
      </div>
    </section>
  </div>

  <ShareModal
    v-if="workspace"
    v-model:open="shareModalOpen"
    :workspace-id="workspace.id"
    :folder-id="shareContext.folderId"
    :folder-name="shareContext.folderName"
  />

  <PromptModal
    v-model:open="promptModal.open"
    :title="promptModal.title"
    :description="promptModal.description"
    :placeholder="promptModal.placeholder"
    :confirm-label="promptModal.confirmLabel"
    :initial-value="promptModal.initialValue"
    @confirm="promptModal.onConfirm"
  />
</template>
