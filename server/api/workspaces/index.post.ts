import { serverSupabaseClient } from '#supabase/server'
import { serverSupabaseUser } from '~~/server/utils/auth'
import { getPublicUserId } from '~~/server/utils/publicUser'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const name = body?.name?.trim() || 'Novo Workspace'

  const client = await serverSupabaseClient(event)
  const publicUserId = await getPublicUserId(client, user.id)
  if (!publicUserId) throw createError({ statusCode: 403, statusMessage: 'Access denied' })

  const { data: workspace, error } = await client
    .from('workspaces')
    .insert({ owner_id: publicUserId, name })
    .select('id, name')
    .single()

  if (error || !workspace) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create workspace' })
  }

  return { ...workspace, isOwner: true }
})
