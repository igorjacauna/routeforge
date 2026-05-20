import { serverSupabaseClient } from '#supabase/server'
import { serverSupabaseUser } from '~~/server/utils/auth'
import { getPublicUserId } from '~~/server/utils/publicUser'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const authUser = await serverSupabaseUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { id: workspaceId } = getRouterParams(event)
  const { folderId } = getQuery(event) as { folderId?: string }

  const client = await serverSupabaseClient(event)
  const publicUserId = await getPublicUserId(client, authUser.id)
  if (!publicUserId) throw createError({ statusCode: 403, statusMessage: 'Access denied' })

  const { data: workspace } = await db
    .from('workspaces').select('id').eq('id', workspaceId).eq('owner_id', publicUserId).single()

  if (!workspace) throw createError({ statusCode: 403, statusMessage: 'Access denied' })

  const membersQuery = db
    .from('team_members')
    .select('id, role, status, folder_id, invited_at, accepted_at, users(id, email, display_name, full_name), folders(id, name)')
    .eq('workspace_id', workspaceId)
    .eq('status', 'accepted')

  if (folderId) {
    membersQuery.eq('folder_id', folderId)
  } else if (folderId === '') {
    membersQuery.is('folder_id', null)
  }

  const invitationsQuery = db
    .from('workspace_invitations')
    .select('id, invited_email, role, status, folder_id, created_at, expires_at, folders(id, name)')
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')

  if (folderId) {
    invitationsQuery.eq('folder_id', folderId)
  } else if (folderId === '') {
    invitationsQuery.is('folder_id', null)
  }

  const [{ data: members }, { data: invitations }] = await Promise.all([
    membersQuery,
    invitationsQuery,
  ])

  return {
    members: members || [],
    invitations: invitations || [],
  }
})
