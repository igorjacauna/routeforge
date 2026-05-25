<template>
  <div class="flex flex-col h-full bg-default">
    <!-- Presence bar -->
    <div
      v-if="presentUsers.length > 1"
      class="flex items-center gap-2 px-4 py-1.5 border-b border-default bg-elevated/50"
    >
      <div class="flex -space-x-1.5">
        <UTooltip
          v-for="u in presentUsers"
          :key="u.name"
          :text="u.name"
        >
          <div
            class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ring-2 ring-white dark:ring-gray-900"
            :style="{ backgroundColor: u.color }"
          >
            {{ u.name.charAt(0).toUpperCase() }}
          </div>
        </UTooltip>
      </div>
      <span class="text-xs text-muted">
        {{ presentUsers.length }} people editing
      </span>
    </div>

    <!-- Error state -->
    <div v-if="hasError" class="flex-1 flex items-center justify-center">
      <UAlert
        icon="i-heroicons-exclamation-triangle"
        color="error"
        variant="soft"
        title="Falha na conexão"
        description="Não foi possível conectar ao servidor de colaboração. Tente recarregar a página."
        class="max-w-sm"
      />
    </div>

    <!-- Loading overlay while syncing -->
    <div v-else-if="!isSynced" class="flex-1 p-4 space-y-3">
      <USkeleton class="h-4 w-3/4" />
      <USkeleton class="h-4 w-1/2" />
      <USkeleton class="h-4 w-2/3" />
      <USkeleton class="h-4 w-1/3" />
      <USkeleton class="h-4 w-4/5" />
    </div>

    <!-- CodeMirror editor -->
    <div v-show="isSynced && !hasError" ref="editorContainer" class="flex-1 overflow-hidden" />
  </div>
</template>

<script setup lang="ts">
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'
import { yCollab } from 'y-codemirror.next'
import { routeforge } from '~/lib/routeforge-language'

const props = withDefaults(
  defineProps<{
    fileId: string
    fileName?: string
  }>(),
  { fileName: 'Untitled' },
)

const emit = defineEmits<{
  save: []
  saveStateChange: [state: 'idle' | 'saving' | 'saved']
}>()

const editorContainer = ref<HTMLElement | null>(null)

const { yText, provider, presentUsers, localColor, isSynced, hasError } = useCollaboration(
  computed(() => props.fileId),
)

const { state: saveState } = useSaveState(yText)

watch(saveState, (s) => emit('saveStateChange', s))

let view: EditorView | null = null

const initEditor = () => {
  if (!editorContainer.value || view) return

  view = new EditorView({
    state: EditorState.create({
      doc: yText.toString(),
      extensions: [
        basicSetup,
        routeforge(),
        keymap.of([
          { key: 'Mod-s', run: () => { emit('save'); return true } },
          indentWithTab,
        ]),
        yCollab(yText, provider.value?.awareness ?? null),
        EditorView.theme({
          '&': { height: '100%', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: '14px' },
          '.cm-scroller': { overflow: 'auto', lineHeight: '1.6' },
          '.cm-content': { padding: '24px' },
          '.cm-focused': { outline: 'none' },
          '.cm-gutters': {
            backgroundColor: 'var(--ui-bg-elevated, #f9fafb)',
            color: 'var(--ui-text-muted, #9ca3af)',
            borderRight: '1px solid var(--ui-border, #e5e7eb)',
          },
          '.cm-activeLineGutter': {
            backgroundColor: 'var(--ui-bg-elevated, #f3f4f6)',
            color: 'var(--ui-text, #374151)',
          },
          '.cm-cursor': {
            borderLeftColor: `${localColor.value} !important`,
            borderLeftWidth: '2px',
          },
          '.cm-cursor-secondary': {
            borderLeftColor: `${localColor.value} !important`,
          },
        }),
      ],
    }),
    parent: editorContainer.value,
  })
}

// Init editor once document is synced and container is mounted
watch(isSynced, (synced) => {
  if (synced) nextTick(initEditor)
})

onMounted(() => {
  if (isSynced.value) initEditor()
})

onUnmounted(() => {
  view?.destroy()
  view = null
})
</script>
