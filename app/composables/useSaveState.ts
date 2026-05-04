import type * as Y from 'yjs'

export type SaveState = 'idle' | 'saving' | 'saved'

export const useSaveState = (yText: Y.Text) => {
  const state = ref<SaveState>('idle')
  const lastSavedContent = ref('')
  let saveTimeoutId: ReturnType<typeof setTimeout> | null = null

  const updateSaveState = () => {
    const currentContent = yText.toString()
    const hasChanges = currentContent !== lastSavedContent.value

    if (hasChanges) {
      state.value = 'saving'

      // Clear existing timeout
      if (saveTimeoutId) clearTimeout(saveTimeoutId)

      // Sync with server debounce of 500ms
      saveTimeoutId = setTimeout(() => {
        lastSavedContent.value = currentContent
        state.value = 'saved'

        // Show "Saved" for 2 seconds, then go back to idle
        setTimeout(() => {
          state.value = 'idle'
        }, 2000)
      }, 500)
    }
  }

  // Initialize last saved content
  lastSavedContent.value = yText.toString()

  // Listen for changes
  yText.observe(() => {
    updateSaveState()
  })

  onUnmounted(() => {
    if (saveTimeoutId) clearTimeout(saveTimeoutId)
  })

  return { state }
}
