import { serverSupabaseClient } from '#supabase/server'
import { serverSupabaseUser } from '~~/server/utils/auth'

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

    const { data: profile, error: profileError } = await client
      .from('users')
      .select('*')
      .eq('auth_id', user.id)
      .single()

    if (profileError) throw profileError

    if (!profile) {
      return { user: null, workspace: null, workspaces: [] }
    }

    const { data: workspace, error: workspaceError } = await client
      .from('workspaces')
      .select('id, name, description')
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (workspaceError && workspaceError.code !== 'PGRST116') {
      throw workspaceError
    }

    const { data: workspaces, error: workspacesError } = await client
      .from('workspaces')
      .select('id, name, description, owner_id')
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: true })

    if (workspacesError) throw workspacesError

    return {
      user: profile,
      workspace: workspace || null,
      workspaces: workspaces || []
    }
  } catch (error) {
    console.error('Profile fetch error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch profile'
    })
  }
})
