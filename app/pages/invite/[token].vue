<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

useSeoMeta({ title: 'Convite - RouteForge' })

const route = useRoute()
const router = useRouter()
const token = route.params.token as string

const user = useSupabaseUser()
const { login } = useAuth()
const toast = useToast()

interface InvitationData {
  id: string
  invited_email: string
  role: string
  status: string
  isExpired: boolean
  workspace_id: string
  folder_id: string | null
  workspaces: { id: string, name: string } | null
  folders: { id: string, name: string } | null
  users: { email: string, display_name: string | null, full_name: string | null } | null
}

const { data: invitation, status } = await useFetch<InvitationData>(`/api/invitations/${token}`, {
  server: false
})

const isAccepting = ref(false)
const wrongEmail = computed(() =>
  user.value && invitation.value
    ? user.value.email?.toLowerCase() !== invitation.value.invited_email
    : false
)

const inviterName = computed(() => {
  const u = invitation.value?.users
  return u?.display_name || u?.full_name || u?.email || 'Alguém'
})

const workspaceName = computed(() => invitation.value?.workspaces?.name || 'um workspace')
const folderName = computed(() => invitation.value?.folders?.name || null)
const scopeLabel = computed(() =>
  folderName.value
    ? `a pasta "${folderName.value}" em ${workspaceName.value}`
    : `o workspace "${workspaceName.value}"`
)
const roleLabel = computed(() => invitation.value?.role === 'editor' ? 'Editor' : 'Visualizador')

const handleAccept = async () => {
  if (!user.value) {
    await login(route.fullPath)
    return
  }

  isAccepting.value = true
  try {
    const result = await $fetch<{ workspace_id: string }>(`/api/invitations/${token}/accept`, {
      method: 'POST'
    })
    toast.add({
      title: 'Convite aceito!',
      description: `Você agora tem acesso a "${workspaceName.value}"`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    await router.push(`/workspace/${result.workspace_id}`)
  } catch (err: any) {
    const msg = err?.data?.statusMessage || ''
    const msgMap: Record<string, string> = {
      'Invitation already used': 'Este convite já foi utilizado.',
      'Invitation expired': 'Este convite expirou.',
      'This invitation was sent to a different email address':
        `Este convite foi enviado para ${invitation.value?.invited_email}. Você está logado com outro e-mail.`
    }
    toast.add({
      title: 'Erro ao aceitar convite',
      description: msgMap[msg] || 'Tente novamente.',
      color: 'error',
      icon: 'i-lucide-alert-triangle'
    })
  } finally {
    isAccepting.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center px-4">
    <div class="max-w-md w-full">
      <!-- Loading -->
      <div
        v-if="status === 'pending'"
        class="text-center space-y-3"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="size-8 mx-auto animate-spin text-primary"
        />
        <p class="text-muted">
          Carregando convite...
        </p>
      </div>

      <!-- Error / not found -->
      <UCard
        v-else-if="status === 'error'"
        class="text-center"
      >
        <div class="py-4 space-y-4">
          <div class="mx-auto size-12 rounded-full bg-error/10 flex items-center justify-center">
            <UIcon
              name="i-lucide-link-2-off"
              class="size-6 text-error"
            />
          </div>
          <h1 class="text-xl font-bold">
            Convite não encontrado
          </h1>
          <p class="text-sm text-muted">
            Este link é inválido ou foi removido.
          </p>
          <UButton
            to="/"
            variant="soft"
          >
            Voltar ao início
          </UButton>
        </div>
      </UCard>

      <!-- Expired -->
      <UCard
        v-else-if="invitation?.isExpired || invitation?.status === 'expired'"
        class="text-center"
      >
        <div class="py-4 space-y-4">
          <div class="mx-auto size-12 rounded-full bg-warning/10 flex items-center justify-center">
            <UIcon
              name="i-lucide-clock"
              class="size-6 text-warning"
            />
          </div>
          <h1 class="text-xl font-bold">
            Convite expirado
          </h1>
          <p class="text-sm text-muted">
            Este convite expirou. Peça ao proprietário do workspace que envie um novo convite.
          </p>
          <UButton
            to="/"
            variant="soft"
          >
            Voltar ao início
          </UButton>
        </div>
      </UCard>

      <!-- Already accepted -->
      <UCard
        v-else-if="invitation?.status === 'accepted'"
        class="text-center"
      >
        <div class="py-4 space-y-4">
          <div class="mx-auto size-12 rounded-full bg-success/10 flex items-center justify-center">
            <UIcon
              name="i-lucide-check-circle"
              class="size-6 text-success"
            />
          </div>
          <h1 class="text-xl font-bold">
            Convite já aceito
          </h1>
          <p class="text-sm text-muted">
            Você já faz parte de <strong>{{ workspaceName }}</strong>.
          </p>
          <UButton
            v-if="invitation?.workspace_id"
            :to="`/workspace/${invitation.workspace_id}`"
            color="primary"
          >
            Abrir workspace
          </UButton>
          <UButton
            v-else
            to="/"
            variant="soft"
          >
            Ir para o início
          </UButton>
        </div>
      </UCard>

      <!-- Valid invitation -->
      <UCard v-else-if="invitation">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-route"
              class="size-5 text-primary"
            />
            <span class="text-lg font-bold">RouteForge</span>
          </div>
        </template>

        <div class="space-y-5">
          <div class="text-center space-y-2">
            <div class="mx-auto size-14 rounded-full bg-primary/10 flex items-center justify-center">
              <UIcon
                name="i-lucide-users"
                class="size-7 text-primary"
              />
            </div>
            <h1 class="text-xl font-bold">
              Você foi convidado!
            </h1>
            <p class="text-sm text-muted leading-relaxed">
              <strong class="text-default">{{ inviterName }}</strong>
              convidou você para colaborar em
              <strong class="text-default">{{ scopeLabel }}</strong>
              como <strong class="text-default">{{ roleLabel }}</strong>.
            </p>
          </div>

          <!-- Email mismatch warning -->
          <UAlert
            v-if="wrongEmail"
            icon="i-lucide-alert-triangle"
            color="warning"
            variant="soft"
            title="E-mail diferente"
            :description="`Este convite foi enviado para ${invitation.invited_email}. Você está logado com ${user?.email}.`"
          />

          <!-- Not logged in -->
          <UButton
            v-if="!user"
            icon="i-simple-icons-google"
            block
            size="lg"
            color="neutral"
            variant="solid"
            @click="() => login(route.fullPath)"
          >
            Entrar com Google para aceitar
          </UButton>

          <!-- Logged in + right email -->
          <UButton
            v-else-if="!wrongEmail"
            icon="i-lucide-check"
            block
            size="lg"
            color="primary"
            :loading="isAccepting"
            @click="handleAccept"
          >
            Aceitar convite
          </UButton>

          <!-- Logged in + wrong email -->
          <div
            v-else
            class="space-y-2"
          >
            <UButton
              block
              variant="soft"
              color="error"
              disabled
            >
              Aceitar convite
            </UButton>
            <p class="text-xs text-center text-muted">
              Faça logout e entre com <strong>{{ invitation.invited_email }}</strong> para aceitar.
            </p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
