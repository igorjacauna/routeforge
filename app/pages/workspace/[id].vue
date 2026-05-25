<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
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

interface WorkspaceItem {
  id: string
  name: string
  isOwner: boolean
}

const currentWorkspace = ref<WorkspaceItem | null>(null)
const allWorkspaces = ref<WorkspaceItem[]>([])
const isLoadingWorkspaceInfo = ref(true)

const breadcrumbs = ref<Array<{ id: string, name: string }>>([])
const editorSaveState = ref<'idle' | 'saving' | 'saved'>('idle')
const shareModalOpen = ref(false)

const promptModal = ref({
  open: false,
  title: '',
  placeholder: '',
  confirmLabel: 'Confirmar',
  initialValue: '',
  onConfirm: (_value: string) => {}
})

const openPrompt = (opts: Omit<typeof promptModal.value, 'open'>) => {
  promptModal.value = { open: true, ...opts }
}

const workspaceMenuItems = computed(() => {
  const workspaceItems = allWorkspaces.value.map(w => ({
    label: w.name,
    icon: w.isOwner ? 'i-lucide-layers' : 'i-lucide-users',
    checked: w.id === workspaceId,
    onSelect: () => { if (w.id !== workspaceId) router.push(`/workspace/${w.id}`) }
  }))

  return [
    workspaceItems,
    [{ label: 'Novo workspace', icon: 'i-lucide-plus', onSelect: createNewWorkspace }]
  ]
})

const createNewWorkspace = () => {
  openPrompt({
    title: 'Novo workspace',
    placeholder: 'Nome do workspace',
    confirmLabel: 'Criar',
    initialValue: '',
    onConfirm: async (name) => {
      try {
        const created = await $fetch<WorkspaceItem>('/api/workspaces', {
          method: 'POST',
          body: { name }
        })
        allWorkspaces.value.push(created)
        router.push(`/workspace/${created.id}`)
        toast.add({ title: `Workspace "${created.name}" criado`, color: 'success', icon: 'i-lucide-check' })
      } catch {
        toast.add({ title: 'Erro ao criar workspace', color: 'error', icon: 'i-lucide-alert-triangle' })
      }
    }
  })
}

useSeoMeta({
  title: 'Workspace - RouteForge'
})

const currentFile = computed(() => {
  if (!selectedFileId.value) return null
  return files.value.find(f => f.id === selectedFileId.value)
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

  const file = files.value.find(f => f.id === selectedFileId.value)
  if (!file) return

  let currentFolderId = file.parentFolderId

  while (currentFolderId) {
    const folder = folders.value.find(f => f.id === currentFolderId)
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
      title: `Falha ao mover ${type}`,
      description: err?.statusMessage || err?.message || 'Tente novamente.',
      color: 'error',
      icon: 'i-lucide-alert-triangle'
    })
  }
}

const handleBreadcrumbNavigate = () => {
  selectFile(null)
}

const handleCreateFirstFile = () => {
  openPrompt({
    title: 'Novo arquivo',
    placeholder: 'untitled.route',
    confirmLabel: 'Criar',
    initialValue: '',
    onConfirm: name => handleCreateFile(null, name)
  })
}

onMounted(async () => {
  try {
    const [workspacesData, wsData] = await Promise.all([
      $fetch<WorkspaceItem[]>('/api/workspaces'),
      fetchWorkspace(workspaceId)
    ])

    allWorkspaces.value = workspacesData

    const fromList = workspacesData.find(w => w.id === workspaceId)
    if (fromList) {
      currentWorkspace.value = fromList
    } else if (wsData?.workspace) {
      currentWorkspace.value = wsData.workspace as WorkspaceItem
    }
  } catch (err) {
    console.error('Error loading workspace:', err)
  } finally {
    isLoadingWorkspaceInfo.value = false
  }
})
</script>

<template>
  <div class="flex flex-1 min-h-0 overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-64 shrink-0 border-r border-default bg-elevated/30 flex flex-col min-h-0">
      <!-- Workspace header -->
      <div class="h-12 px-2 border-b border-default flex items-center gap-1 shrink-0">
        <UDropdownMenu
          :items="workspaceMenuItems"
          :content="{ align: 'start', side: 'bottom' }"
          class="flex-1 min-w-0"
        >
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            class="w-full justify-start gap-2 min-w-0 px-2"
            :loading="isLoadingWorkspaceInfo"
          >
            <UIcon
              name="i-lucide-layers"
              class="size-4 text-primary shrink-0"
            />
            <span class="truncate font-medium text-sm">{{ currentWorkspace?.name ?? 'Carregando...' }}</span>
            <UIcon
              name="i-lucide-chevrons-up-down"
              class="size-3.5 text-muted shrink-0 ml-auto"
            />
          </UButton>
        </UDropdownMenu>

        <UTooltip
          v-if="currentWorkspace?.isOwner"
          text="Compartilhar workspace"
        >
          <UButton
            icon="i-lucide-users"
            variant="ghost"
            color="neutral"
            size="xs"
            @click="shareModalOpen = true"
          />
        </UTooltip>
      </div>

      <FileExplorer
        :files="files"
        :folders="folders"
        :selected-file-id="selectedFileId"
        :is-loading="isLoading || isLoadingWorkspaceInfo"
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
          <UIcon
            name="i-lucide-chevron-right"
            class="size-4 text-muted shrink-0"
          />
          <UIcon
            name="i-lucide-file-code-2"
            class="size-4 text-primary shrink-0"
          />
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
              <UIcon
                name="i-lucide-loader-2"
                class="size-3.5 animate-spin"
              />
              <span>Salvando...</span>
            </div>
            <div
              v-else-if="editorSaveState === 'saved'"
              class="flex items-center gap-1.5 text-xs text-success"
            >
              <UIcon
                name="i-lucide-check"
                class="size-3.5"
              />
              <span>Salvo</span>
            </div>
            <div
              v-else
              class="text-xs text-muted/60"
            >
              Todas as alterações salvas
            </div>
          </Transition>

          <UButton
            icon="i-lucide-users"
            variant="soft"
            color="primary"
            size="xs"
            @click="shareModalOpen = true"
          >
            Compartilhar
          </UButton>
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
              <UIcon
                name="i-lucide-file-plus-2"
                class="size-7"
              />
            </div>
            <h3 class="text-base font-semibold mb-1">
              Nenhum arquivo selecionado
            </h3>
            <p class="text-sm text-muted mb-5">
              Selecione um arquivo na barra lateral ou crie um novo.
            </p>
            <UButton
              icon="i-lucide-plus"
              color="primary"
              size="sm"
              @click="handleCreateFirstFile"
            >
              Novo arquivo
            </UButton>
          </div>
        </div>
      </div>
    </section>
    <ShareModal
      v-model:open="shareModalOpen"
      :workspace-id="workspaceId"
    />

    <PromptModal
      v-model:open="promptModal.open"
      :title="promptModal.title"
      :placeholder="promptModal.placeholder"
      :confirm-label="promptModal.confirmLabel"
      :initial-value="promptModal.initialValue"
      @confirm="promptModal.onConfirm"
    />
  </div>
</template>
