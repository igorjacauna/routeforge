import { serverSupabaseClient } from '#supabase/server'
import { serverSupabaseUser } from '~~/server/utils/auth'
import { getPublicUserId } from '~~/server/utils/publicUser'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  const folderId = event.context.params?.id

  if (!user || !folderId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  try {
    const client = await serverSupabaseClient(event)

    const { data: folder, error: getError } = await client
      .from('folders')
      .select('workspace_id')
      .eq('id', folderId)
      .single()

    if (getError) throw getError
    if (!folder) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Folder not found'
      })
    }

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
      .eq('id', folder.workspace_id)
      .eq('owner_id', publicUserId)
      .single()

    if (workspaceError || !workspace) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied'
      })
    }

    const { error: deleteError } = await client
      .from('folders')
      .delete()
      .eq('id', folderId)

    if (deleteError) throw deleteError

    return { success: true }
  } catch (error) {
    console.error('Delete folder error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete folder'
    })
  }
})
