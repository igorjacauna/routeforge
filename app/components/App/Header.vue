<script setup lang="ts">
import useAuth from '~/composables/auth';

const { breadcrumItems = [] } = defineProps<{
  breadcrumItems?: Array<{ label?: string; to?: string }>;
}>();

const { logout } = useAuth();
</script>
<template>
  <UDashboardNavbar title="Routeforge">
    <template #trailing>
      <UBreadcrumb
        v-if="breadcrumItems.length > 0"
        class="ml-5"
        :items="[
          {
            icon: 'i-lucide-house',
            to: '/'
          },
          ...breadcrumItems,
        ]"
      />
    </template>
    <template #right>
      <slot name="action" />
      <UButton icon="i-lucide-door-open" variant="ghost" @click="logout">Logout</UButton>
    </template>
  </UDashboardNavbar>
</template>