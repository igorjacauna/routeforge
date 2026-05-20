import { serverSupabaseClient } from '#supabase/server'
import { serverSupabaseUser } from '~~/server/utils/auth'
import { getPublicUserId } from '~~/server/utils/publicUser'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const name = body?.name?.trim()

  if (!name) throw createError({ statusCode: 400, statusMessage: 'Name is required' })

  const client = await serverSupabaseClient(event)
  const publicUserId = await getPublicUserId(client, user.id)
  if (!publicUserId) throw createError({ statusCode: 403, statusMessage: 'Access denied' })

  const { data: workspace, error } = await client
    .from('workspaces')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', publicUserId)
    .select('id, name')
    .single()

  if (error || !workspace) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied or workspace not found' })
  }

  return workspace
})
