<script setup lang="ts">
const { logout, user } = useAuth()

const userInitials = computed(() => {
  const email = user.value?.email ?? ''
  return email.slice(0, 2).toUpperCase() || '?'
})

const userMenu = computed(() => [
  [
    {
      label: user.value?.email ?? 'User',
      slot: 'account',
      disabled: true
    }
  ],
  [
    {
      label: 'Logout',
      icon: 'i-lucide-log-out',
      onSelect: logout
    }
  ]
])
</script>

<template>
  <div class="flex flex-col h-screen bg-default">
    <UHeader :ui="{ root: 'border-b border-default', container: 'h-14' }">
      <template #left>
        <NuxtLink to="/" class="flex items-center gap-2">
          <UIcon name="i-lucide-route" class="size-6 text-primary" />
          <span class="text-lg font-bold tracking-tight">RouteForge</span>
        </NuxtLink>
      </template>

      <template #right>
        <UDropdownMenu :items="userMenu" :content="{ align: 'end' }">
          <UButton variant="ghost" color="neutral" size="sm" class="gap-2">
            <UAvatar :alt="userInitials" size="xs" />
            <span class="hidden md:inline text-sm">{{ user?.email }}</span>
            <UIcon name="i-lucide-chevron-down" class="size-3.5 opacity-60" />
          </UButton>

          <template #account>
            <div class="flex flex-col gap-0.5 px-1.5 py-1">
              <span class="text-xs text-muted">Signed in as</span>
              <span class="truncate text-sm font-medium">{{ user?.email }}</span>
            </div>
          </template>
        </UDropdownMenu>
      </template>
    </UHeader>

    <UMain class="flex-1 min-h-0 flex flex-col">
      <NuxtPage />
    </UMain>
  </div>
</template>
