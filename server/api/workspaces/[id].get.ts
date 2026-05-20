import { serverSupabaseClient } from '#supabase/server'
import { serverSupabaseUser } from '~~/server/utils/auth'
import { getPublicUserId } from '~~/server/utils/publicUser'
import { getWorkspaceAccess, getSubtreeFolderIds } from '~~/server/utils/access'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { id } = getRouterParams(event)

  const client = await serverSupabaseClient(event)
  const publicUserId = await getPublicUserId(client, user.id)
  if (!publicUserId) throw createError({ statusCode: 403, statusMessage: 'Access denied' })

  const [access, { data: workspaceMeta }] = await Promise.all([
    getWorkspaceAccess(publicUserId, id),
    client.from('workspaces').select('id, name').eq('id', id).single(),
  ])

  if (!access) throw createError({ statusCode: 403, statusMessage: 'Access denied' })

  const { data: files, error: filesError } = await client
    .from('files').select('*').eq('workspace_id', id)

  const { data: folders, error: foldersError } = await client
    .from('folders').select('*').eq('workspace_id', id)

  if (filesError || foldersError) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch workspace' })
  }

  const allFiles = files || []
  const allFolders = folders || []

  const workspaceInfo = { id, name: workspaceMeta?.name ?? '', isOwner: access.isOwner }

  // Proprietário e membros workspace-level veem tudo
  if (access.isOwner || access.isWorkspaceLevel) {
    return { workspace: workspaceInfo, files: allFiles, folders: allFolders }
  }

  // Membro pasta-level: filtra apenas a subárvore concedida
  const accessibleFolderIds = getSubtreeFolderIds(access.grantedFolderIds, allFolders)
  const filteredFolders = allFolders.filter(f => accessibleFolderIds.has(f.id))
  const filteredFiles = allFiles.filter(f => f.folder_id && accessibleFolderIds.has(f.folder_id))

  return { workspace: workspaceInfo, files: filteredFiles, folders: filteredFolders }
})
