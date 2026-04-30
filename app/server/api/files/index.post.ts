import { db } from '~/server/db'

export default defineEventHandler(async (event) => {
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const { workspaceId, name, folderId } = await readBody(event)

  if (!workspaceId || !name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields'
    })
  }

  // Verify user owns workspace
  const { data: workspace } = await db
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('owner_id', user.id)
    .single()

  if (!workspace) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied'
    })
  }

  // Create file
  const { data: file, error } = await db
    .from('files')
    .insert({
      workspace_id: workspaceId,
      folder_id: folderId || null,
      name,
      content: '',
      created_by_id: user.id,
      updated_by_id: user.id
    })
    .select()
    .single()

  if (error || !file) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create file'
    })
  }

  return file
})
