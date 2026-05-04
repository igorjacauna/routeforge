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
      class="fixed z-50 min-w-[160px] bg-default rounded-lg shadow-lg border border-default py-1 ring-1 ring-default"
      :style="{ top: y + 'px', left: x + 'px' }"
    >
      <button
        v-for="item in items"
        :key="item.id"
        :class="[
          'w-full px-3 py-1.5 text-left text-sm flex items-center gap-2.5 hover:bg-elevated transition-colors',
          item.dangerous ? 'text-error' : 'text-default'
        ]"
        @click="selectItem(item)"
      >
        <UIcon :name="item.icon" class="size-4" />
        <span>{{ item.label }}</span>
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
