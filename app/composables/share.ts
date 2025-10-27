import { doc, updateDoc } from 'firebase/firestore';

// app/composables/public-access.ts
export function usePublicAccess() {
  const db = useFirestore();

  const generatePublicToken = () => {
    return crypto.randomUUID();
  };

  const getPublicUrl = (token: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/public/${token}`;
  };

  const enablePublicAccess = async (
    type: 'workspace' | 'project' | 'document',
    ids: {
      workspaceId: string;
      projectId?: string;
      documentId?: string;
    },
  ) => {
    const token = generatePublicToken();

    let docPath = '';
    if (type === 'workspace') {
      docPath = `workspaces/${ids.workspaceId}`;
    } else if (type === 'project') {
      docPath = `workspaces/${ids.workspaceId}/projects/${ids.projectId}`;
    } else {
      docPath = `workspaces/${ids.workspaceId}/projects/${ids.projectId}/documents/${ids.documentId}`;
    }

    await updateDoc(doc(db, docPath), {
      publicAccess: {
        enabled: true,
        token,
        createdAt: new Date(),
        expiresAt: null,
      },
    });

    return {
      token,
      url: getPublicUrl(token),
    };
  };

  const disablePublicAccess = async (
    type: 'workspace' | 'project' | 'document',
    ids: {
      workspaceId: string;
      projectId?: string;
      documentId?: string;
    },
  ) => {
    let docPath = '';
    if (type === 'workspace') {
      docPath = `workspaces/${ids.workspaceId}`;
    } else if (type === 'project') {
      docPath = `workspaces/${ids.workspaceId}/projects/${ids.projectId}`;
    } else {
      docPath = `workspaces/${ids.workspaceId}/projects/${ids.projectId}/documents/${ids.documentId}`;
    }

    await updateDoc(doc(db, docPath), {
      'publicAccess.enabled': false,
    });
  };

  const copyPublicLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
  };

  return {
    enablePublicAccess,
    disablePublicAccess,
    getPublicUrl,
    copyPublicLink,
  };
}