<script setup lang="ts">

const toast = useToast();
const openCreate = ref(false);
const { workspaces } = useWorkspacesList();
const sharedWorkspaces = useAllSharedWorkspaces();
const sharedProjects = useAllSharedProjects();
const sharedDocuments = useAllSharedDocuments();
const { addWorkspace, deleteWorkspace } = useWorkspaces();

function onSubmitWorkspaceCreate(event: { data: { name: string } }) {
  addWorkspace(event.data)
    .then(() => {
      toast.add({
        title: 'Workspace created',
        description: 'Your workspace has been created successfully.',
        color: 'success',
      });
      openCreate.value = false;
    })
    .catch((reason) => {
      toast.add({
        title: 'Error creating workspace',
        description: reason.message,
        color: 'error',
      });
    });
}

function onDeleteWorkspace(workspaceId?: string) {
  if (!workspaceId) {
    toast.add({
      title: 'Error deleting workspace',
      description: 'Workspace ID is required.',
      color: 'error',
    });
    return;
  }
  deleteWorkspace(workspaceId)
    .then(() => {
      toast.add({
        title: 'Workspace deleted',
        description: 'Your workspace has been deleted successfully.',
        color: 'success',
      });
    })
    .catch((reason) => {
      toast.add({
        title: 'Error deleting workspace',
        description: reason.message,
        color: 'error',
      });
    });
};
</script>
<template>
  <UDashboardPanel>
    <template #header>
      <AppHeader>
        <template #actions>
          <WorkspaceCreateModal v-model="openCreate" @submit="onSubmitWorkspaceCreate" />
        </template>
      </AppHeader>
    </template>
    <template #body>
      <UPageHeader title="Workspaces" />
      <UPageGrid>
        <template v-for="item in workspaces" :key="item.id">
          <UContextMenu
            :items="[
              {
                label: 'Delete',
                icon: 'i-lucide-trash',
                color: 'error',
                onClick: () => onDeleteWorkspace(item.id),
              }
            ]"
          >
          <UPageCard
            :title="item.name"
            :to="`/workspace/${item.id}`"
            variant="subtle"
          />
          </UContextMenu>
        </template>
      </UPageGrid>
      <USeparator />
      <UPageHeader description="Shared with you" />
      <UPageGrid>
        <template v-for="item in sharedWorkspaces" :key="item.id">
          <UPageCard
            :title="item.name"
            :to="`/workspace/${item.id}`"
            variant="subtle"
          />
        </template>
        <template v-for="item in sharedProjects" :key="item.id">
          <UPageCard
            :title="item.name"
            :to="`/workspace/${item.workspaceId}/project/${item.id}`"
            variant="subtle"
          />
        </template>
        <template v-for="item in sharedDocuments" :key="item.id">
          <UPageCard
            :title="item.title"
            :to="`/workspace/${item.workspaceId}/project/${item.projectId}/document/${item.id}`"
            variant="subtle"
          />
        </template>
      </UPageGrid>
    </template>
  </UDashboardPanel>
</template>