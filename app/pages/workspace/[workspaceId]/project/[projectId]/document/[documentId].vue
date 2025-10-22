<script setup lang="ts">

const toast = useToast();
const route = useRoute();

if (!route.params.id) {
  createError('Workspace ID is required');
}

const workspaceId = computed(() => route.params.workspaceId as string);
const projectId = computed(() => route.params.projectId as string);
const documentId = computed(() => route.params.documentId as string);

const { getDocument, updateDocument } = useDocuments(workspaceId, projectId);
const { getProject } = useProjects(workspaceId);
const { getWorkspace } = useWorkspaces();
const project = getProject(projectId.value);
const workspace = getWorkspace(workspaceId.value);
const document = getDocument(documentId.value);

watch(() => document.value?.content, (newValue) => {
  updateDocument(documentId.value, { content: newValue })
    .catch((reason) => {
      toast.add({
        title: 'Error saving document',
        description: reason.message,
        color: 'error',
      });
    });
});

</script>
<template>
  <UDashboardPanel :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <AppHeader
        :breadcrum-items="[
          {
            label: workspace?.name,
            to: `/workspace/${workspace?.id}`
          },
          {
            label: project?.name,
            to: `/workspace/${workspace?.id}/project/${project?.id}`
          },
          {
            label: document?.title,
            to: `/workspace/${workspace?.id}/project/${project?.id}/document/${documentId}`
          }
        ]"
      />
    </template>
    <template #body>
      <template v-if="!document">
        <div class="p-4 text-center text-gray-500">
          Loading document...
        </div>
      </template>
      <Monaco v-else v-model="document.content" />
    </template>
  </UDashboardPanel>
</template>
