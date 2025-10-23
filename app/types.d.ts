
declare global {
  interface Workspace {
    id?: string;
    name: string;
    ownerId: string;
    editors?: string[]; // Array de userIds que podem editar
    viewers?: string[]; // Array de userIds que podem visualizar
    createdAt: Date;
  }

  interface Project {
    id?: string;
    workspaceId: string;
    name: string;
    ownerId: string;
    editors?: string[]; // Array de userIds que podem editar
    viewers?: string[]; // Array de userIds que podem visualizar
    createdAt: Date;
  }

  interface DocumentFile {
    id?: string;
    projectId: string;
    workspaceId: string;
    title: string;
    content: string;
    ownerId: string;
    editors?: string[]; // Array de userIds que podem editar
    viewers?: string[]; // Array de userIds que podem visualizar
    createdAt: Date;
  }

  interface ShareInvitation {
    id: string;
    resourceType: 'workspace' | 'project' | 'document';
    resourceId: string;
    invitedBy: string;
    invitedEmail: string;
    token: string;
    expiresAt: number; // timestamp
    status: 'pending' | 'accepted' | 'expired';
    createdAt: number; // timestamp
  }
}

export { };

