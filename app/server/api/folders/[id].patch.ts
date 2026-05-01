export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  const folderId = event.context.params?.id

  if (!user || !folderId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const body = await readBody(event)
  const { name, parentFolderId } = body

  if (!name && parentFolderId === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No fields to update'
    })
  }

  try {
    const client = await serverSupabaseClient(event)

    // Get folder and verify ownership
    const { data: folder, error: getError } = await client
      .from('folders')
      .select('workspace_id, parent_folder_id')
      .eq('id', folderId)
      .single()

    if (getError) throw getError
    if (!folder) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Folder not found'
      })
    }

    // Verify workspace ownership
    const { data: workspace, error: workspaceError } = await client
      .from('workspaces')
      .select('id')
      .eq('id', folder.workspace_id)
      .eq('owner_id', user.id)
      .single()

    if (workspaceError || !workspace) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied'
      })
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (name) {
      updateData.name = name.trim()
    }

    if (parentFolderId !== undefined) {
      updateData.parent_folder_id = parentFolderId || null
    }

    // Update folder
    const { data: updated, error: updateError } = await client
      .from('folders')
      .update(updateData)
      .eq('id', folderId)
      .select()
      .single()

    if (updateError || !updated) {
      throw updateError || new Error('Failed to update folder')
    }

    return updated
  } catch (error) {
    console.error('Update folder error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update folder'
    })
  }
})
