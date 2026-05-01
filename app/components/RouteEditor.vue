<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <!-- Editor Container -->
    <div class="flex-1 overflow-hidden">
      <textarea
        ref="editorElement"
        v-model="content"
        class="w-full h-full p-6 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-0 resize-none focus:outline-none"
        :placeholder="placeholder"
        @input="handleInput"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    content: string
    fileName?: string
  }>(),
  {
    fileName: 'Untitled'
  }
)

const emit = defineEmits<{
  'update:content': [value: string]
  save: []
}>()

const content = ref(props.content)
const editorElement = ref<HTMLTextAreaElement | null>(null)

const placeholder = computed(
  () =>
    `# ${props.fileName}\n\n/**\n * Document your API route\n */\nGET /api/endpoint\n\nRequest {\n  key: string\n}\n\nResponse {\n  result: string\n}`
)

watch(() => props.content, (newContent) => {
  if (newContent !== content.value) {
    content.value = newContent
  }
})

const handleInput = (e: Event) => {
  const target = e.target as HTMLTextAreaElement
  content.value = target.value
  emit('update:content', content.value)
}

// Keyboard shortcut: Cmd+S or Ctrl+S to save
onMounted(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      emit('save')
    }
  }

  window.addEventListener('keydown', handleKeydown)

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
})

// Focus editor on mount
onMounted(() => {
  editorElement.value?.focus()
})
</script>
