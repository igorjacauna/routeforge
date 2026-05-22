import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'

export interface CollabUser {
  name: string
  color: string
  colorLight: string
}

export type SaveState = 'idle' | 'saving' | 'saved'

const COLORS = ['#E57373', '#81C784', '#64B5F6', '#FFB74D', '#BA68C8', '#4DB6AC', '#F06292', '#AED581']

function userColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]!
}

function uint8ToBase64(arr: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i])
  return btoa(binary)
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64)
  const arr = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
  return arr
}

export const useCollaboration = (fileId: Ref<string | null>) => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const ydoc = new Y.Doc()
  const yText = ydoc.getText('content')
  const awareness = new Awareness(ydoc)
  const channel = shallowRef<ReturnType<typeof supabase.channel> | null>(null)
  const presentUsers = ref<CollabUser[]>([])
  const isConnected = ref(false)
  const isSynced = ref(false)
  const hasError = ref(false)
  const saveState = ref<SaveState>('idle')

  let isRemoteUpdate = false
  let initDone = false
  let saveTimeout: ReturnType<typeof setTimeout> | null = null
  let lastSavedContent = ''

  const color = userColor(user.value?.id ?? crypto.randomUUID())
  const name = user.value?.email?.split('@')[0] ?? 'Anonymous'
  const colorLight = `${color}40`

  const doSave = async (id: string) => {
    const content = yText.toString()
    if (content === lastSavedContent) return

    saveState.value = 'saving'
    const { error } = await supabase
      .from('files')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      lastSavedContent = content
      saveState.value = 'saved'
      setTimeout(() => { if (saveState.value === 'saved') saveState.value = 'idle' }, 2000)
    }
  }

  const scheduleSave = (id: string) => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => doSave(id), 5000)
  }

  const save = () => {
    if (!fileId.value) return
    if (saveTimeout) clearTimeout(saveTimeout)
    doSave(fileId.value)
  }

  const loadInitialContent = async (id: string) => {
    const { data, error } = await supabase
      .from('files')
      .select('content')
      .eq('id', id)
      .single()

    if (!error && data) {
      isRemoteUpdate = true
      yText.delete(0, yText.length)
      yText.insert(0, data.content ?? '')
      lastSavedContent = data.content ?? ''
      isRemoteUpdate = false
    }
  }

  const updatePresentUsers = () => {
    presentUsers.value = Array.from(awareness.getStates().entries())
      .filter(([, state]: [any, any]) => state.user)
      .map(([, state]: [any, any]) => state.user as CollabUser)
  }

  const connect = (id: string) => {
    if (!import.meta.client) return
    if (initDone) return
    initDone = true

    // Set local awareness state (cursor position is set by yCollab)
    awareness.setLocalStateField('user', { name, color, colorLight })

    loadInitialContent(id).then(() => {
      isSynced.value = true
    })

    // Yjs document sync: broadcast local updates
    ydoc.on('update', (update: Uint8Array) => {
      if (isRemoteUpdate) return
      channel.value?.send({
        type: 'broadcast',
        event: 'ydoc-update',
        payload: { update: uint8ToBase64(update) },
      })
      scheduleSave(id)
    })

    // Awareness sync: broadcast local awareness changes
    let awarenessSyncTimeout: ReturnType<typeof setTimeout> | null = null
    awareness.on('update', () => {
      if (awarenessSyncTimeout) clearTimeout(awarenessSyncTimeout)
      awarenessSyncTimeout = setTimeout(() => {
        const state = awareness.getLocalState()
        if (state && channel.value) {
          channel.value.send({
            type: 'broadcast',
            event: 'awareness',
            payload: {
              name: state.user?.name ?? name,
              color: state.user?.color ?? color,
              colorLight: state.user?.colorLight ?? colorLight,
            },
          })
        }
      }, 100) // debounce rapid cursor changes
    })

    updatePresentUsers()

    const c = supabase.channel(`file:${id}`, {
      config: { broadcast: { self: false } },
    })

    c.on('broadcast', { event: 'ydoc-update' }, ({ payload }: { payload: { update: string } }) => {
      isRemoteUpdate = true
      const update = base64ToUint8(payload.update)
      Y.applyUpdate(ydoc, update)
      isRemoteUpdate = false
      scheduleSave(id)
    })

    c.on('broadcast', { event: 'awareness' }, ({ payload }: { payload: CollabUser }) => {
      // Track remote user presence (color + name)
      presentUsers.value = [
        ...presentUsers.value.filter(u => u.name !== payload.name),
        { name: payload.name, color: payload.color, colorLight: payload.colorLight },
      ]
      // Remove stale entries after 30s of silence
      clearTimeout((c as any).__cleanupTimer)
      ;(c as any).__cleanupTimer = setTimeout(() => {
        presentUsers.value = presentUsers.value.filter(u => u.name === name)
        awareness.getStates().forEach((state, clientID) => {
          if (state.user?.name === name) return // keep local
          awareness.states.delete(clientID)
        })
      }, 30000)
    })

    c.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        isConnected.value = true
        hasError.value = false
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        hasError.value = true
      }
    })

    channel.value = c
  }

  const disconnect = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
      if (fileId.value && yText.toString() !== lastSavedContent) {
        doSave(fileId.value)
      }
    }
    if (channel.value) {
      supabase.removeChannel(channel.value)
      channel.value = null
    }
    awareness.destroy()
    initDone = false
    isConnected.value = false
    isSynced.value = false
    hasError.value = false
    presentUsers.value = []
    saveState.value = 'idle'
  }

  watch(fileId, (id) => {
    disconnect()
    if (id) connect(id)
  }, { immediate: true })

  onUnmounted(disconnect)

  return { ydoc, yText, awareness, channel, presentUsers, isConnected, isSynced, hasError, saveState, save }
}
