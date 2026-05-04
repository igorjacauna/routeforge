import { serverSupabaseClient } from '#supabase/server'
import { serverSupabaseUser } from '~~/server/utils/auth'
import { getPublicUserId } from '~~/server/utils/publicUser'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  try {
    const client = await serverSupabaseClient(event)
    const publicUserId = await getPublicUserId(client, user.id)

    if (!publicUserId) {
      return { workspace: null }
    }

    const { data, error } = await client
      .from('workspaces')
      .select('id, name, description')
      .eq('owner_id', publicUserId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (error && error.code === 'PGRST116') {
      return { workspace: null }
    }

    if (error) throw error

    return { workspace: data }
  } catch (error) {
    console.error('First workspace fetch error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch first workspace'
    })
  }
})
