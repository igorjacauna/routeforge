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

    // Busca user profile
    const { data: profile, error: profileError } = await client
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError

    // Busca primeiro workspace
    const { data: workspace, error: workspaceError } = await client
      .from('workspaces')
      .select('id, name, description')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (workspaceError && workspaceError.code !== 'PGRST116') {
      // PGRST116 = No rows found, que é okay
      throw workspaceError
    }

    // Busca todos os workspaces
    const { data: workspaces, error: workspacesError } = await client
      .from('workspaces')
      .select('id, name, description, owner_id')
      .eq('owner_id', user.id)
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
