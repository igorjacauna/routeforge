export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const { workspaceId, name, parentFolderId } = await readBody(event)

  if (!workspaceId || !name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields'
    })
  }

  try {
    const client = await serverSupabaseClient(event)

    // Verify workspace ownership
    const { data: workspace, error: workspaceError } = await client
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .eq('owner_id', user.id)
      .single()

    if (workspaceError || !workspace) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied'
      })
    }

    // Create folder
    const { data: folder, error: createError: createErr } = await client
      .from('folders')
      .insert({
        workspace_id: workspaceId,
        name: name.trim(),
        parent_folder_id: parentFolderId || null,
        created_by_id: user.id
      })
      .select()
      .single()

    if (createErr || !folder) {
      throw createErr || new Error('Failed to create folder')
    }

    return folder
  } catch (error) {
    console.error('Create folder error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create folder'
    })
  }
})
