<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    description?: string
    placeholder?: string
    confirmLabel?: string
    initialValue?: string
  }>(),
  {
    placeholder: '',
    confirmLabel: 'Confirmar',
    initialValue: '',
  }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [value: string]
}>()

const value = ref(props.initialValue)

watch(
  () => props.open,
  (open) => {
    if (open) value.value = props.initialValue ?? ''
  }
)

const handleConfirm = () => {
  if (!value.value.trim()) return
  emit('confirm', value.value.trim())
  emit('update:open', false)
}

const handleCancel = () => {
  emit('update:open', false)
}
</script>

<template>
  <UModal
    :open="open"
    :title="title"
    :description="description"
    @update:open="$emit('update:open', $event)"
  >
    <template #body>
      <UInput
        v-model="value"
        :placeholder="placeholder"
        autofocus
        @keydown.enter="handleConfirm"
        @keydown.escape="handleCancel"
      />
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="handleCancel">
          Cancelar
        </UButton>
        <UButton :disabled="!value.trim()" @click="handleConfirm">
          {{ confirmLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
