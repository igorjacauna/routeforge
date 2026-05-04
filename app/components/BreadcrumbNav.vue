<template>
  <nav class="flex items-center gap-1.5 text-sm min-w-0">
    <button
      type="button"
      class="flex items-center gap-1.5 text-muted hover:text-default transition-colors shrink-0"
      @click="$emit('navigate', null)"
    >
      <UIcon name="i-lucide-folder" class="size-4" />
      <span>Workspace</span>
    </button>

    <template v-for="(breadcrumb, idx) in breadcrumbs" :key="breadcrumb.id">
      <UIcon name="i-lucide-chevron-right" class="size-3.5 text-muted/60 shrink-0" />
      <button
        type="button"
        :class="[
          'flex items-center gap-1.5 transition-colors min-w-0',
          idx === breadcrumbs.length - 1
            ? 'text-default font-medium'
            : 'text-muted hover:text-default'
        ]"
        @click="$emit('navigate', breadcrumb.id)"
      >
        <span class="truncate">{{ breadcrumb.name }}</span>
      </button>
    </template>
  </nav>
</template>

<script setup lang="ts">
interface Breadcrumb {
  id: string
  name: string
}

defineProps<{
  breadcrumbs: Breadcrumb[]
}>()

defineEmits<{
  navigate: [folderId: string | null]
}>()
</script>
