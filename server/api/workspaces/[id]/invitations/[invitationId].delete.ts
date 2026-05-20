import { serverSupabaseClient } from '#supabase/server'
import { serverSupabaseUser } from '~~/server/utils/auth'
import { getPublicUserId } from '~~/server/utils/publicUser'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const authUser = await serverSupabaseUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { id: workspaceId, invitationId } = getRouterParams(event)

  const client = await serverSupabaseClient(event)
  const publicUserId = await getPublicUserId(client, authUser.id)
  if (!publicUserId) throw createError({ statusCode: 403, statusMessage: 'Access denied' })

  const { data: workspace } = await db
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('owner_id', publicUserId)
    .single()

  if (!workspace) throw createError({ statusCode: 403, statusMessage: 'Access denied' })

  const { error } = await db
    .from('workspace_invitations')
    .delete()
    .eq('id', invitationId)
    .eq('workspace_id', workspaceId)

  if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to cancel invitation' })

  return { success: true }
})
