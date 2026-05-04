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

  const { id } = getRouterParams(event)

  try {
    const client = await serverSupabaseClient(event)
    const publicUserId = await getPublicUserId(client, user.id)

    if (!publicUserId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied'
      })
    }

    const { data: workspace, error: workspaceError } = await client
      .from('workspaces')
      .select('id')
      .eq('id', id)
      .eq('owner_id', publicUserId)
      .single()

    if (workspaceError || !workspace) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied'
      })
    }

    const { data: files, error: filesError } = await client
      .from('files')
      .select('*')
      .eq('workspace_id', id)

    const { data: folders, error: foldersError } = await client
      .from('folders')
      .select('*')
      .eq('workspace_id', id)

    if (filesError || foldersError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch workspace'
      })
    }

    return {
      workspace: { id: workspace.id },
      files: files || [],
      folders: folders || []
    }
  } catch (error) {
    console.error('Get workspace error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch workspace'
    })
  }
})
