<script setup lang="ts">

const toast = useToast();
const route = useRoute();
const openCreate = ref(false);

if (!route.params.id) {
  createError('Workspace ID is required');
}

const workspaceId = computed(() => route.params.workspaceId as string);
const projectId = computed(() => route.params.projectId as string);

const { documents } = useDocumentsList(workspaceId, projectId);
const { addDocument, deleteDocument } = useDocuments(workspaceId, projectId);

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
      openCreate.value = false;
    })
    .catch((reason) => {
      toast.add({
        title: 'Error creating document',
        description: reason.message,
        color: 'error',
      });
    });
}

function onDeleteDocument(documentId?: string) {
  if (!documentId) {
    toast.add({
      title: 'Error deleting document',
      description: 'Document ID is required.',
      color: 'error',
    });
    return;
  }
  deleteDocument(documentId)
    .then(() => {
      toast.add({
        title: 'Document deleted',
        description: 'Your document has been deleted successfully.',
        color: 'success',
      });
    })
    .catch((reason) => {
      toast.add({
        title: 'Error deleting document',
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
          },
          {
            label: project?.name,
            to: `/workspace/${workspace?.id}/project/${project?.id}`
          }
        ]"
      >
        <template #action>
          <DocumentCreateModal v-model="openCreate" @submit="onSubmit" />
        </template>
      </AppHeader>
    </template>
    <template #body>
      <UPageHeader :title="`Documents from ${project?.name}`" />
      <UPageGrid>
        <template v-for="item in documents" :key="item.id">
          <UContextMenu
            :items="[
              {
                label: 'Delete',
                icon: 'i-lucide-trash',
                color: 'error',
                onClick: () => onDeleteDocument(item.id),
              }
            ]"
          >
            <UPageCard
              :title="item.title"
              :to="`/workspace/${workspaceId}/project/${projectId}/document/${item.id}`"
              variant="subtle"
            />
          </UContextMenu>
        </template>
      </UPageGrid>
    </template>
  </UDashboardPanel>
</template>