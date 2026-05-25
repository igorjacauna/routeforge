import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

export interface CollabUser {
  name: string
  color: string
  colorLight: string
}

const COLORS = [
  '#E53935', '#D81B60', '#8E24AA', '#5E35B1', '#3949AB', '#1E88E5',
  '#039BE5', '#00ACC1', '#00897B', '#43A047', '#7CB342', '#C0CA33',
  '#FDD835', '#FFB300', '#FB8C00', '#F4511E',
]

function userColor(id: string, takenColors: Set<string>): string {
  // Deterministic slot from user identity
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i)
  const idx = Math.abs(hash) % COLORS.length

  // If slot is free, use it. Otherwise scan for the first free slot.
  const candidate = COLORS[idx]!
  if (!takenColors.has(candidate)) return candidate

  for (let i = 0; i < COLORS.length; i++) {
    const c = COLORS[(idx + i) % COLORS.length]!
    if (!takenColors.has(c)) return c
  }
  return candidate // fallback (all 16 taken by different people)
}

export const useCollaboration = (fileId: Ref<string | null>) => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const ydoc = new Y.Doc()
  const yText = ydoc.getText('content')
  const provider = shallowRef<HocuspocusProvider | null>(null)
  const presentUsers = ref<CollabUser[]>([])
  const isConnected = ref(false)
  const isSynced = ref(false)
  const hasError = ref(false)

  const connect = (id: string) => {
    if (!import.meta.client) return

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${proto}//${window.location.host}/ws/collab`

    const p = new HocuspocusProvider({
      url,
      name: id,
      document: ydoc,
      token: async () => {
        const { data } = await supabase.auth.getSession()
        return data.session?.access_token ?? ''
      },
      onConnect: () => { isConnected.value = true; hasError.value = false },
      onDisconnect: () => { isConnected.value = false; isSynced.value = false },
      onSynced: () => { isSynced.value = true },
      onClose: () => { hasError.value = true },
    })

    const idForColor = user.value?.id || user.value?.email || crypto.randomUUID()
    const takenColors = new Set(
      Array.from(p.awareness!.getStates().values())
        .map((s: any) => s.user?.color)
        .filter(Boolean)
    )
    const color = userColor(idForColor, takenColors)

    p.awareness?.setLocalStateField('user', {
      name: user.value?.email?.split('@')[0] ?? 'Anonymous',
      color,
      colorLight: `${color}40`,
    })

    p.awareness?.on('change', () => {
      presentUsers.value = Array.from(p.awareness!.getStates().values())
        .filter((s: any) => s.user)
        .map((s: any) => s.user) as CollabUser[]
    })

    provider.value = p
  }

  const disconnect = () => {
    provider.value?.destroy()
    provider.value = null
    isConnected.value = false
    isSynced.value = false
    hasError.value = false
    presentUsers.value = []
  }

  watch(fileId, (id) => {
    disconnect()
    if (id) connect(id)
  }, { immediate: true })

  onUnmounted(disconnect)

  return { ydoc, yText, provider, presentUsers, isConnected, isSynced, hasError }
}
