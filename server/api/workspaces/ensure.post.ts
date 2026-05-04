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

    // Find or create public.users record
    let { data: publicUser } = await client
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!publicUser) {
      const { data: created, error: createUserError } = await client
        .from('users')
        .insert({
          auth_id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name ?? null,
          display_name: user.user_metadata?.full_name?.split(' ')[0] ?? null
        })
        .select('id')
        .single()

      if (createUserError || !created) {
        throw createUserError || new Error('Failed to create user record')
      }
      publicUser = created
    }

    // Find or create default workspace
    const { data: existing } = await client
      .from('workspaces')
      .select('id, name, description')
      .eq('owner_id', publicUser.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (existing) {
      return { workspace: existing }
    }

    const { data: workspace, error: createWorkspaceError } = await client
      .from('workspaces')
      .insert({
        owner_id: publicUser.id,
        name: 'My Workspace'
      })
      .select('id, name, description')
      .single()

    if (createWorkspaceError || !workspace) {
      throw createWorkspaceError || new Error('Failed to create workspace')
    }

    return { workspace }
  } catch (error) {
    console.error('Ensure workspace error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to ensure workspace'
    })
  }
})
