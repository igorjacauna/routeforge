import { serverSupabaseClient } from '#supabase/server'
import { serverSupabaseUser } from '~~/server/utils/auth'
import { getPublicUserId } from '~~/server/utils/publicUser'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  const fileId = event.context.params?.id

  if (!user || !fileId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  try {
    const client = await serverSupabaseClient(event)

    const { data: file, error: getError } = await client
      .from('files')
      .select('id, workspace_id')
      .eq('id', fileId)
      .single()

    if (getError) throw getError
    if (!file) {
      throw createError({
        statusCode: 404,
        statusMessage: 'File not found'
      })
    }

    const publicUserId = await getPublicUserId(client, user.id)

    if (!publicUserId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden'
      })
    }

    const { data: workspace, error: workspaceError } = await client
      .from('workspaces')
      .select('id')
      .eq('id', file.workspace_id)
      .eq('owner_id', publicUserId)
      .single()

    if (workspaceError || !workspace) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden'
      })
    }

    const { error: deleteError } = await client
      .from('files')
      .delete()
      .eq('id', fileId)

    if (deleteError) throw deleteError

    return { success: true }
  } catch (error) {
    console.error('Delete file error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete file'
    })
  }
})
