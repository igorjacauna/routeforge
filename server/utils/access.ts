import { db } from './db'

export type WorkspaceAccess = {
  isOwner: boolean
  isWorkspaceLevel: boolean
  grantedFolderIds: string[]
}

export async function getWorkspaceAccess(
  publicUserId: string,
  workspaceId: string
): Promise<WorkspaceAccess | null> {
  const { data: workspace } = await db
    .from('workspaces').select('id')
    .eq('id', workspaceId).eq('owner_id', publicUserId).single()

  if (workspace) return { isOwner: true, isWorkspaceLevel: false, grantedFolderIds: [] }

  const { data: members } = await db
    .from('team_members').select('folder_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', publicUserId)
    .eq('status', 'accepted')

  if (!members?.length) return null

  const hasWorkspaceLevel = members.some(m => m.folder_id === null)
  if (hasWorkspaceLevel) return { isOwner: false, isWorkspaceLevel: true, grantedFolderIds: [] }

  return {
    isOwner: false,
    isWorkspaceLevel: false,
    grantedFolderIds: members.map(m => m.folder_id as string).filter(Boolean)
  }
}

// Expande os IDs das pastas raízes para incluir todos os descendentes
export function getSubtreeFolderIds(
  rootIds: string[],
  allFolders: { id: string; parent_folder_id: string | null }[]
): Set<string> {
  const result = new Set(rootIds)
  const queue = [...rootIds]

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const f of allFolders) {
      if (f.parent_folder_id === current && !result.has(f.id)) {
        result.add(f.id)
        queue.push(f.id)
      }
    }
  }

  return result
}

// Verifica se um arquivo está em alguma das pastas concedidas (sobe na hierarquia)
export async function isFileInGrantedFolder(
  fileFolderId: string | null,
  grantedFolderIds: string[]
): Promise<boolean> {
  if (!fileFolderId) return false
  const granted = new Set(grantedFolderIds)
  let currentId: string | null = fileFolderId

  while (currentId) {
    if (granted.has(currentId)) return true
    const { data } = await db
      .from('folders').select('parent_folder_id').eq('id', currentId).single()
    currentId = data?.parent_folder_id ?? null
  }

  return false
}
