<script setup lang="ts">

const toast = useToast();
const route = useRoute();

if (!route.params.id) {
  createError('Workspace ID is required');
}

const workspaceId = computed(() => route.params.workspaceId as string);
const projectId = computed(() => route.params.projectId as string);

const { documents } = useDocumentsList(workspaceId, projectId);
const { addDocument } = useDocuments(workspaceId, projectId);

const { getProject } = useProjects(workspaceId);
const { getWorkspace } = useWorkspaces();
const project = getProject(projectId.value);
const workspace = getWorkspace(workspaceId.value);

function onSubmit(event: { data: { title: string } }) {
  addDocument(event.data)
    .then(() => {
      toast.add({
        title: 'Document created',
        description: 'Your document has been created successfully.',
        color: 'success',
      });
    })
    .catch((reason) => {
      toast.add({
        title: 'Error creating document',
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
        <template #leading>
          <UButton icon="i-lucide-house" to="/" variant="ghost" />
        </template>
        <template #trailing>
          <UBreadcrumb
            :items="[
              {
                label: workspace?.name,
                to: `/workspace/${workspace?.id}`
              },
              {
                label: project?.name,
                to: `/workspace/${workspace?.id}/project/${project?.id}`
              }
            ]"
          />
        </template>
        <template #right>
          <DocumentCreateModal @submit="onSubmit" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <UPageGrid class="lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-px">
        <UPageCard
          v-for="(item, index) in documents"
          :key="index"
          :title="item.title"
          :to="`/workspace/${workspaceId}/project/${projectId}/document/${item.id}`"
          variant="subtle"
        />
      </UPageGrid>
    </template>
  </UDashboardPanel>
</template>