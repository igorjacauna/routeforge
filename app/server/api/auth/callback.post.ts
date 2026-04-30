import { db } from '~/server/db'

export default defineEventHandler(async (event) => {
  const { code } = getQuery(event)

  if (!code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing authorization code'
    })
  }

  try {
    // Exchange code for session
    const { data, error } = await db.auth.exchangeCodeForSession(code as string)

    if (error || !data.session) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Failed to authenticate'
      })
    }

    const user = data.session.user

    // Check if user exists in public.users table
    const { data: existingUser, error: userError } = await db
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    let workspaceId: string

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create new user and workspace
      const { data: newUser, error: createUserError } = await db
        .from('users')
        .insert({
          auth_id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || '',
          display_name: user.user_metadata?.full_name?.split(' ')[0] || 'User'
        })
        .select('id')
        .single()

      if (createUserError || !newUser) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to create user'
        })
      }

      // Create default workspace
      const { data: workspace, error: workspaceError } = await db
        .from('workspaces')
        .insert({
          owner_id: newUser.id,
          name: 'My Workspace'
        })
        .select('id')
        .single()

      if (workspaceError || !workspace) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to create workspace'
        })
      }

      // Create root folder for workspace
      await db
        .from('folders')
        .insert({
          workspace_id: workspace.id,
          name: 'Root',
          parent_folder_id: null,
          created_by_id: newUser.id
        })

      workspaceId = workspace.id
    } else if (!userError && existingUser) {
      // User exists, get their workspace
      const { data: workspace, error: getWorkspaceError } = await db
        .from('workspaces')
        .select('id')
        .eq('owner_id', existingUser.id)
        .single()

      if (getWorkspaceError || !workspace) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to find workspace'
        })
      }

      workspaceId = workspace.id
    } else {
      throw createError({
        statusCode: 500,
        statusMessage: 'Database error'
      })
    }

    // Set secure HTTP-only cookie with access token
    setCookie(event, 'sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    // Also set refresh token
    setCookie(event, 'sb-refresh-token', data.session.refresh_token || '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    })

    // Redirect to workspace
    return sendRedirect(event, `/workspace/${workspaceId}`)
  } catch (err) {
    console.error('Auth callback error:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Authentication failed'
    })
  }
})
