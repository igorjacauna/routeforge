
declare global {
  type FileType = 'file' | 'folder';
  type FileNode = {
    id: string;             // ID do documento no Firestore
    name: string;           // Nome do arquivo ou pasta
    type: FileType;
    parentId: string | null; // ID da pasta pai (null para raiz)
    ownerId: string;        // ID do usuário dono (auth.uid)
    createdAt: Date; // Ou string, dependendo da lib
  };

  type TreeViewItem = {
    label: string;
    children?: TreeViewItem[];
    type: FileType;
    id: string;
  };

  type Role = 'owner' | 'editor' | 'viewer';

  type AccessibleNode = {
    user_id: string;
    node_id: string;
    name: string;
    type: 'folder' | 'doc';
    parent_id: string | null;
    owner_id: string;
    content: string | null;
    role: Role;
  }
}

export { };
