import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';

export function useDocuments(workspaceId: Ref<string | null>, projectId: Ref<string | null>) {
  const db = useFirestore();
  const user = useCurrentUser();

  const addDocument = async (data: Omit<DocumentFile, 'id' | 'createdAt' | 'projectId' | 'ownerId' | 'content'>) => {
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
  if (!workspaceId.value || !projectId.value) throw createError('Workspace ID and Project ID are required');
  const documents = useSharedCollection<DocumentFile>(`workspaces/${workspaceId.value}/projects/${projectId.value}/documents`);
  return { documents };
}