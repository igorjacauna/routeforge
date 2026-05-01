<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-40"
      @click="$emit('close')"
      @contextmenu.prevent="$emit('close')"
    />
    <div
      v-if="visible"
      class="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1"
      :style="{ top: y + 'px', left: x + 'px' }"
    >
      <button
        v-for="item in items"
        :key="item.id"
        @click="selectItem(item)"
        :class="[
          'w-full px-4 py-2 text-left text-sm flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
          item.dangerous ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
        ]"
      >
        <UIcon :name="item.icon" class="w-4 h-4" />
        {{ item.label }}
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
export interface ContextMenuItem {
  id: string
  label: string
  icon: string
  dangerous?: boolean
}

defineProps<{
  visible: boolean
  x: number
  y: number
  items: ContextMenuItem[]
}>()

const emit = defineEmits<{
  select: [item: ContextMenuItem]
  close: []
}>()

const selectItem = (item: ContextMenuItem) => {
  emit('select', item)
  emit('close')
}
</script>
