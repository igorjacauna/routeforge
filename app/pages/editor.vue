<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui';

const items: TabsItem[] = [
  {
    label: 'All',
    value: 'all',
  },
  {
    label: 'Unread',
    value: 'unread',
  },
];
</script>
<template>
  <UDashboardGroup>
    <UDashboardNavbar :items="items" />
    <UDashboardPanel class="h-full w-full">
      <Monaco class="h-dvh" />
    </UDashboardPanel>
  </UDashboardGroup>
</template>