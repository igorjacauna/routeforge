<script setup lang="ts">

const toast = useToast();

const { workspaces } = useWorkspacesList();
const { addWorkspace } = useWorkspaces();
function onSubmitWorkspaceCreate(event: { data: { name: string } }) {
  addWorkspace(event.data)
    .then(() => {
      toast.add({
        title: 'Workspace created',
        description: 'Your workspace has been created successfully.',
        color: 'success',
      });
    })
    .catch((reason) => {
      toast.add({
        title: 'Error creating workspace',
        description: reason.message,
        color: 'error',
      });
    });
}
</script>
<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Routeforge">
        <template #right>
          <WorkspaceCreateModal @submit="onSubmitWorkspaceCreate" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <UPageGrid class="lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-px">
        <UPageCard
          v-for="(item, index) in workspaces"
          :key="index"
          :title="item.name"
          :to="`/workspace/${item.id}`"
          variant="subtle"
        />
      </UPageGrid>
    </template>
  </UDashboardPanel>
</template>