<script setup lang="ts">

const toast = useToast();
const route = useRoute();

if (!route.params.id) {
  createError('Workspace ID is required');
}

const workspaceId = computed(() => route.params.workspaceId as string);

const { projects } = useProjectsList(workspaceId);
const { addProject } = useProjects(workspaceId);


function onSubmit(event: { data: { name: string } }) {
  addProject(event.data)
    .then(() => {
      toast.add({
        title: 'Project created',
        description: 'Your project has been created successfully.',
        color: 'success',
      });
    })
    .catch((reason) => {
      toast.add({
        title: 'Error creating project',
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
        <template #right>
          <ProjectCreateModal @submit="onSubmit" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <UPageGrid class="lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-px">
        <UPageCard
          v-for="(project, index) in projects"
          :key="index"
          :title="project.name"
          :to="`/workspace/${workspaceId}/project/${project.id}`"
          variant="subtle"
        />
      </UPageGrid>
    </template>
  </UDashboardPanel>
</template>