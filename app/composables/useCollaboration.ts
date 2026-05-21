import * as Y from 'yjs'

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

  const connect = (id: string) => {
    if (!import.meta.client) return
    if (initDone) return
    initDone = true

    const color = userColor(user.value?.id ?? 'anon')
    const name = user.value?.email?.split('@')[0] ?? 'Anonymous'
    const colorLight = `${color}40`

    loadInitialContent(id).then(() => {
      isSynced.value = true
    })

    ydoc.on('update', (_update: Uint8Array) => {
      if (isRemoteUpdate) return
      // Broadcast to other clients
      channel.value?.send({
        type: 'broadcast',
        event: 'ydoc-update',
        payload: { update: uint8ToBase64(_update) },
      })
      // Debounced auto-save to database
      scheduleSave(id)
    })

    const c = supabase.channel(`file:${id}`, {
      config: {
        broadcast: { self: false },
        presence: { key: user.value?.id ?? 'anon' },
      },
    })

    c.on('broadcast', { event: 'ydoc-update' }, ({ payload }: { payload: { update: string } }) => {
      isRemoteUpdate = true
      const update = base64ToUint8(payload.update)
      Y.applyUpdate(ydoc, update)
      isRemoteUpdate = false
      scheduleSave(id)
    })

    c.on('presence', { event: 'sync' }, () => {
      const state = c.presenceState()
      presentUsers.value = Object.values(state)
        .flat()
        .map((s: any) => ({ name: s.name, color: s.color, colorLight: s.colorLight }))
    })

    c.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        isConnected.value = true
        hasError.value = false
        await c.track({ name, color, colorLight })
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        hasError.value = true
      }
    })

    channel.value = c
  }

  const disconnect = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
      // Flush pending save before leaving
      if (fileId.value && yText.toString() !== lastSavedContent) {
        doSave(fileId.value)
      }
    }
    if (channel.value) {
      supabase.removeChannel(channel.value)
      channel.value = null
    }
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

  return { ydoc, yText, channel, presentUsers, isConnected, isSynced, hasError, saveState, save }
}
