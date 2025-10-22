<script setup lang="ts">

const toast = useToast();
const route = useRoute();
const openCreate = ref(false);

if (!route.params.id) {
  createError('Workspace ID is required');
}

const workspaceId = computed(() => route.params.workspaceId as string);

const { projects } = useProjectsList(workspaceId);
const { addProject, deleteProject } = useProjects(workspaceId);
const { getWorkspace } = useWorkspaces();
const workspace = getWorkspace(workspaceId.value);

function onSubmit(event: { data: { name: string } }) {
  addProject(event.data)
    .then(() => {
      toast.add({
        title: 'Project created',
        description: 'Your project has been created successfully.',
        color: 'success',
      });
      openCreate.value = false;
    })
    .catch((reason) => {
      toast.add({
        title: 'Error creating project',
        description: reason.message,
        color: 'error',
      });
    });
}

function onDeleteProject(projectId?: string) {
  if (!projectId) {
    toast.add({
      title: 'Error deleting workspace',
      description: 'Workspace ID is required.',
      color: 'error',
    });
    return;
  }
  deleteProject(projectId)
    .then(() => {
      toast.add({
        title: 'Project deleted',
        description: 'Your project has been deleted successfully.',
        color: 'success',
      });
    })
    .catch((reason) => {
      toast.add({
        title: 'Error deleting project',
        description: reason.message,
        color: 'error',
      });
    });
}
</script>
<template>
  <UDashboardPanel>
    <template #header>
      <AppHeader
        :breadcrum-items="[
          {
            label: workspace?.name,
            to: `/workspace/${workspace?.id}`
          }
        ]"
      >
        <template #action>
          <ProjectCreateModal v-model="openCreate" @submit="onSubmit" />
        </template>
      </AppHeader>
    </template>
    <template #body>
      <UPageHeader :title="`Projects from ${workspace?.name}`" />
      <UPageGrid>
        <template v-for="item in projects" :key="item.id">
          <UContextMenu
            :items="[
              {
                label: 'Delete',
                icon: 'i-lucide-trash',
                color: 'error',
                onClick: () => onDeleteProject(item.id),
              }
            ]"
          >
            <UPageCard
              :title="item.name"
              :to="`/workspace/${workspaceId}/project/${item.id}`"
              variant="subtle"
            />
          </UContextMenu>
        </template>
      </UPageGrid>
    </template>
  </UDashboardPanel>
</template>