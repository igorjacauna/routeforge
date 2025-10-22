
declare global {
  interface Workspace {
    id?: string;
    name: string;
    ownerId: string;
    sharedWith?: Record<string, 'viewer' | 'editor'>;
    createdAt: Date;
  }

  interface Project {
    id?: string;
    workspaceId: string;
    name: string;
    ownerId: string;
    sharedWith?: Record<string, 'viewer' | 'editor'>;
    createdAt: Date;
  }

  interface DocumentFile {
    id?: string;
    projectId: string;
    title: string;
    content: string;
    ownerId: string;
    sharedWith?: Record<string, 'viewer' | 'editor'>;
    createdAt: Date;
  }
}

export { };

