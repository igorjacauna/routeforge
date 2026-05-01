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

    // Get file to verify ownership
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

    // Verify workspace ownership
    const { data: workspace, error: workspaceError } = await client
      .from('workspaces')
      .select('owner_id')
      .eq('id', file.workspace_id)
      .single()

    if (workspaceError || workspace?.owner_id !== user.id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden'
      })
    }

    // Delete the file
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
