import {
  addDoc,
  collection,
  deleteDoc,
  doc,
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
  const workspaces = useSharedCollection<Workspace>('workspaces');
  return { workspaces };
}