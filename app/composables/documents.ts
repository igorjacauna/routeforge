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
  updateDoc,
  where,
} from 'firebase/firestore';

export function useDocuments(workspaceId: Ref<string | null>, projectId: Ref<string | null>) {
  const db = useFirestore();
  const user = useCurrentUser();

  const addDocument = async (data: Omit<DocumentFile, 'id' | 'createdAt' | 'projectId' | 'ownerId' | 'content' | 'workspaceId'>) => {
    if (!workspaceId.value || !projectId.value) throw new Error('Missing IDs');
    if (!user.value) throw new Error('Not authenticated');
    await addDoc(collection(db, `workspaces/${workspaceId.value}/projects/${projectId.value}/documents`), {
      ...data,
      workspaceId: workspaceId.value,
      projectId: projectId.value,
      ownerId: user.value.uid,
      createdAt: new Date(),
    });
  };

  const updateDocument = async (id: string, data: Partial<DocumentFile>) => {
    if (!workspaceId.value || !projectId.value) throw new Error('Missing IDs');
    return updateDoc(doc(db, `workspaces/${workspaceId.value}/projects/${projectId.value}/documents`, id), data);
  };

  const deleteDocument = async (id: string) => {
    if (!workspaceId.value || !projectId.value) throw new Error('Missing IDs');
    return deleteDoc(doc(db, `workspaces/${workspaceId.value}/projects/${projectId.value}/documents`, id));
  };

  const getDocument = (id: string) =>
    useDocument<DocumentFile>(
      doc(db, `workspaces/${workspaceId.value}/projects/${projectId.value}/documents`, id),
    );

  const updateDocumentContent = async (id: string, content: string) => {
    if (!workspaceId.value || !projectId.value) throw new Error('Missing IDs');
    await updateDoc(doc(db, `workspaces/${workspaceId.value}/projects/${projectId.value}/documents`, id), { content });
  };

  return {
    addDocument,
    updateDocument,
    deleteDocument,
    getDocument,
    updateDocumentContent,
  };
}

export function useDocumentsList(workspaceId: Ref<string | null>, projectId: Ref<string | null>) {
  const db = useFirestore();

  const documentsQuery = computed(() => {
    if (!workspaceId.value || !projectId.value) return null;
    return query(
      collection(db, `workspaces/${workspaceId.value}/projects/${projectId.value}/documents`),
    ) as Query<DocumentFile>;
  });

  const documents = useCollection<DocumentFile>(documentsQuery);

  return { documents };
}

export function useAllSharedDocuments() {
  const db = useFirestore();
  const user = useCurrentUser();

  // Busca onde sou editor
  const editorsQuery = computed(() => {
    if (!user.value) return null;
    return query(
      collectionGroup(db, 'documents'),
      where('editors', 'array-contains', user.value.uid),
    ) as Query<DocumentFile>;
  });

  // Busca onde sou viewer
  const viewersQuery = computed(() => {
    if (!user.value) return null;
    return query(
      collectionGroup(db, 'documents'),
      where('viewers', 'array-contains', user.value.uid),
    ) as Query<DocumentFile>;
  });

  const editors = useCollection<DocumentFile>(editorsQuery);
  const viewers = useCollection<DocumentFile>(viewersQuery);

  // Combina ambos os resultados
  const combined = computed(() => {
    const map = new Map<string, DocumentFile>();
    for (const d of editors.value) map.set(d.id!, d);
    for (const d of viewers.value) map.set(d.id!, d);
    return Array.from(map.values());
  });

  return combined;
}