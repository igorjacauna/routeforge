import type {
  Query,
} from 'firebase/firestore';
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  query,
  where,
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
  const db = useFirestore();
  const projectsQuery = computed(() => {
    if (!workspaceId.value) return null;
    return query(
      collection(db, `workspaces/${workspaceId.value}/projects`),
    ) as Query<Project>;
  });
  const projects = useCollection<Project>(projectsQuery);
  return { projects };
}

export function useAllSharedProjects() {
  const db = useFirestore();
  const user = useCurrentUser();

  // Busca onde sou editor
  const editorsQuery = computed(() => {
    if (!user.value) return null;
    return query(
      collectionGroup(db, 'projects'),
      where('editors', 'array-contains', user.value.uid),
    ) as Query<Project>;
  });

  // Busca onde sou viewer
  const viewersQuery = computed(() => {
    if (!user.value) return null;
    return query(
      collectionGroup(db, 'projects'),
      where('viewers', 'array-contains', user.value.uid),
    ) as Query<Project>;
  });

  const editors = useCollection<Project>(editorsQuery);
  const viewers = useCollection<Project>(viewersQuery);

  // Combina ambos os resultados
  const combined = computed(() => {
    const map = new Map<string, Project>();
    for (const d of editors.value) map.set(d.id!, d);
    for (const d of viewers.value) map.set(d.id!, d);
    return Array.from(map.values());
  });

  return combined;
}