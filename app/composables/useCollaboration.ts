import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

export interface CollabUser {
  name: string
  color: string
  colorLight: string
}

const COLORS = ['#E57373', '#81C784', '#64B5F6', '#FFB74D', '#BA68C8', '#4DB6AC', '#F06292', '#AED581']

function userColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]!
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
    const color = userColor(user.value?.id ?? 'anon')

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
