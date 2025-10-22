import {
  addDoc,
  collection,
  deleteDoc,
  doc,
} from 'firebase/firestore';

export function useProjects(workspaceId: Ref<string | null>) {
  const db = useFirestore();
  const user = useCurrentUser();

  const addProject = async (data: Omit<Project, 'id' | 'createdAt' | 'workspaceId' | 'ownerId'>) => {
    if (!workspaceId.value) throw new Error('workspaceId required');
    if (!user.value) throw new Error('Not authenticated');
    return addDoc(collection(db, `workspaces/${workspaceId.value}/projects`), {
      ...data,
      workspaceId: workspaceId.value,
      ownerId: user.value.uid,
      createdAt: new Date(),
    });
  };

  const deleteProject = async (id: string) => {
    if (!workspaceId.value) throw new Error('workspaceId required');
    return deleteDoc(doc(db, `workspaces/${workspaceId.value}/projects`, id));
  };

  const getProject = (id: string) =>
    useDocument<Project>(doc(db, `workspaces/${workspaceId.value}/projects`, id));

  return {
    addProject,
    deleteProject,
    getProject,
  };
}

export function useProjectsList(workspaceId: Ref<string | null>) {
  if (!workspaceId.value) throw createError('Workspace ID is required');
  const projects = useSharedCollection<Project>(`workspaces/${workspaceId.value}/projects`);
  return { projects };
}