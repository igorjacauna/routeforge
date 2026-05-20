<script setup lang="ts">
const props = defineProps<{
  workspaceId: string
  open: boolean
  folderId?: string
  folderName?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const toast = useToast()

const isFolder = computed(() => !!props.folderId)
const title = computed(() =>
  isFolder.value ? `Compartilhar pasta "${props.folderName}"` : 'Compartilhar workspace'
)
const description = computed(() =>
  isFolder.value
    ? `Convide colaboradores por e-mail para acessar a pasta "${props.folderName}".`
    : 'Convide colaboradores por e-mail para editar ou visualizar este workspace.'
)

interface Member {
  id: string
  role: string
  folder_id: string | null
  users: { id: string; email: string; display_name: string | null; full_name: string | null } | null
  folders: { id: string; name: string } | null
}

interface Invitation {
  id: string
  invited_email: string
  role: string
  folder_id: string | null
  folders: { id: string; name: string } | null
}

const members = ref<Member[]>([])
const invitations = ref<Invitation[]>([])
const isLoadingMembers = ref(false)

const inviteEmail = ref('')
const inviteRole = ref<'editor' | 'viewer'>('editor')
const isSending = ref(false)

const roleOptions = [
  { label: 'Editor', value: 'editor' },
  { label: 'Visualizador', value: 'viewer' },
]

const fetchMembers = async () => {
  isLoadingMembers.value = true
  try {
    const params = new URLSearchParams()
    if (props.folderId) params.set('folderId', props.folderId)

    const data = await $fetch<{ members: Member[]; invitations: Invitation[] }>(
      `/api/workspaces/${props.workspaceId}/members?${params}`
    )
    members.value = data.members
    invitations.value = data.invitations
  } catch {
    toast.add({ title: 'Erro ao carregar membros', color: 'error', icon: 'i-lucide-alert-triangle' })
  } finally {
    isLoadingMembers.value = false
  }
}

const handleInvite = async () => {
  if (!inviteEmail.value.trim()) return

  isSending.value = true
  try {
    await $fetch(`/api/workspaces/${props.workspaceId}/invite`, {
      method: 'POST',
      body: {
        email: inviteEmail.value.trim(),
        role: inviteRole.value,
        folderId: props.folderId || undefined,
      },
    })
    toast.add({
      title: 'Convite enviado!',
      description: `Um e-mail foi enviado para ${inviteEmail.value}`,
      color: 'success',
      icon: 'i-lucide-mail-check',
    })
    inviteEmail.value = ''
    await fetchMembers()
  } catch (err: any) {
    const message = err?.data?.statusMessage || ''
    const msgMap: Record<string, string> = {
      'Invitation already sent': 'Já existe um convite pendente para este e-mail.',
      'User is already a member': 'Este usuário já é membro.',
      'Cannot invite yourself': 'Você não pode se convidar.',
    }
    toast.add({
      title: 'Erro ao enviar convite',
      description: msgMap[message] || message || 'Tente novamente.',
      color: 'error',
      icon: 'i-lucide-alert-triangle',
    })
  } finally {
    isSending.value = false
  }
}

const removeMember = async (memberId: string, email: string) => {
  try {
    await $fetch(`/api/workspaces/${props.workspaceId}/members/${memberId}`, { method: 'DELETE' })
    toast.add({ title: `${email} removido`, color: 'success', icon: 'i-lucide-user-minus' })
    await fetchMembers()
  } catch {
    toast.add({ title: 'Erro ao remover membro', color: 'error', icon: 'i-lucide-alert-triangle' })
  }
}

const cancelInvitation = async (invitationId: string, email: string) => {
  try {
    await $fetch(`/api/workspaces/${props.workspaceId}/invitations/${invitationId}`, { method: 'DELETE' })
    toast.add({ title: `Convite para ${email} cancelado`, color: 'success', icon: 'i-lucide-x-circle' })
    await fetchMembers()
  } catch {
    toast.add({ title: 'Erro ao cancelar convite', color: 'error', icon: 'i-lucide-alert-triangle' })
  }
}

const memberName = (m: Member) =>
  m.users?.display_name || m.users?.full_name || m.users?.email || '—'

const memberEmail = (m: Member) => m.users?.email || '—'

watch(
  () => props.open,
  (val) => { if (val) fetchMembers() }
)
</script>

<template>
  <UModal
    :open="open"
    :title="title"
    :description="description"
    @update:open="$emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-6">
        <!-- Scope badge for folder sharing -->
        <div v-if="isFolder" class="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <UIcon name="i-lucide-folder" class="size-4 text-amber-500 shrink-0" />
          <div class="min-w-0">
            <p class="text-sm font-medium text-default truncate">{{ folderName }}</p>
            <p class="text-xs text-muted">Apenas esta pasta e seu conteúdo serão compartilhados</p>
          </div>
        </div>

        <!-- Invite form -->
        <div class="space-y-3">
          <p class="text-sm font-medium text-default">Convidar por e-mail</p>
          <div class="flex gap-2">
            <UInput
              v-model="inviteEmail"
              type="email"
              placeholder="colaborador@exemplo.com"
              class="flex-1"
              :disabled="isSending"
              @keydown.enter="handleInvite"
            />
            <USelect
              v-model="inviteRole"
              :items="roleOptions"
              value-key="value"
              class="w-36"
              :disabled="isSending"
            />
          </div>
          <UButton
            icon="i-lucide-send"
            size="sm"
            :loading="isSending"
            :disabled="!inviteEmail.trim()"
            @click="handleInvite"
          >
            Enviar convite
          </UButton>
        </div>

        <USeparator />

        <!-- Members + invitations list -->
        <div class="space-y-2">
          <p class="text-sm font-medium text-default">
            Membros
            <span v-if="!isLoadingMembers" class="text-muted font-normal">
              ({{ members.length + invitations.length }})
            </span>
          </p>

          <div v-if="isLoadingMembers" class="space-y-2">
            <USkeleton v-for="i in 2" :key="i" class="h-10 w-full" />
          </div>

          <template v-else>
            <div
              v-for="member in members"
              :key="member.id"
              class="flex items-center justify-between gap-3 py-2 px-3 rounded-lg hover:bg-elevated/50"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  {{ memberName(member).charAt(0).toUpperCase() }}
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-medium truncate">{{ memberName(member) }}</p>
                  <p class="text-xs text-muted truncate">{{ memberEmail(member) }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <UBadge
                  :label="member.role === 'editor' ? 'Editor' : 'Visualizador'"
                  variant="soft"
                  color="primary"
                  size="sm"
                />
                <UButton
                  icon="i-lucide-x"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  @click="removeMember(member.id, memberEmail(member))"
                />
              </div>
            </div>

            <div
              v-for="inv in invitations"
              :key="inv.id"
              class="flex items-center justify-between gap-3 py-2 px-3 rounded-lg hover:bg-elevated/50"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="size-7 rounded-full bg-muted/20 text-muted flex items-center justify-center shrink-0">
                  <UIcon name="i-lucide-mail" class="size-3.5" />
                </div>
                <div class="min-w-0">
                  <p class="text-sm truncate text-muted">{{ inv.invited_email }}</p>
                  <p class="text-xs text-muted/60">Convite pendente</p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <UBadge
                  :label="inv.role === 'editor' ? 'Editor' : 'Visualizador'"
                  variant="soft"
                  color="neutral"
                  size="sm"
                />
                <UButton
                  icon="i-lucide-x"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  @click="cancelInvitation(inv.id, inv.invited_email)"
                />
              </div>
            </div>

            <div
              v-if="members.length === 0 && invitations.length === 0"
              class="text-sm text-muted text-center py-4"
            >
              Nenhum colaborador ainda.
            </div>
          </template>
        </div>
      </div>
    </template>
  </UModal>
</template>
