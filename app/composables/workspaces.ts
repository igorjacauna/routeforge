import type {
  Query,
} from 'firebase/firestore';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';

export function useWorkspaces() {
  const db = useFirestore();
  const user = useCurrentUser();

  const addWorkspace = (data: Omit<Workspace, 'id' | 'createdAt' | 'ownerId'>) => {
    if (!user.value) throw new Error('Not authenticated');
    return addDoc(collection(db, 'workspaces'), {
      ...data,
      ownerId: user.value.uid,
      createdAt: new Date(),
    });
  };

  const deleteWorkspace = (id: string) => {
    return deleteDoc(doc(db, 'workspaces', id));
  };

  const getWorkspace = (id: string) => {
    return useDocument<Workspace>(doc(db, 'workspaces', id));
  };

  return {
    addWorkspace,
    deleteWorkspace,
    getWorkspace,
  };
}

export function useWorkspacesList() {
  const workspaces = useOwnerCollection<Workspace>('workspaces');
  return { workspaces };
}

export function useAllSharedWorkspaces() {
  const db = useFirestore();
  const user = useCurrentUser();

  // Busca onde sou editor
  const editorsQuery = computed(() => {
    if (!user.value) return null;
    return query(
      collection(db, 'workspaces'),
      where('editors', 'array-contains', user.value.uid),
    ) as Query<Workspace>;
  });

  // Busca onde sou viewer
  const viewersQuery = computed(() => {
    if (!user.value) return null;
    return query(
      collection(db, 'workspaces'),
      where('viewers', 'array-contains', user.value.uid),
    ) as Query<Workspace>;
  });

  const editors = useCollection<Workspace>(editorsQuery);
  const viewers = useCollection<Workspace>(viewersQuery);

  // Combina ambos os resultados
  const combined = computed(() => {
    const map = new Map<string, Workspace>();
    for (const d of editors.value) map.set(d.id!, d);
    for (const d of viewers.value) map.set(d.id!, d);
    return Array.from(map.values());
  });

  return combined;
}