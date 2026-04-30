import { db } from '~/server/db'

export default defineEventHandler(async (event) => {
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const { id } = getRouterParams(event)
  const { content } = await readBody(event)

  if (!content) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing content'
    })
  }

  // Get file and verify ownership
  const { data: file } = await db
    .from('files')
    .select('workspace_id')
    .eq('id', id)
    .single()

  if (!file) {
    throw createError({
      statusCode: 404,
      statusMessage: 'File not found'
    })
  }

  const { data: workspace } = await db
    .from('workspaces')
    .select('id')
    .eq('id', file.workspace_id)
    .eq('owner_id', user.id)
    .single()

  if (!workspace) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied'
    })
  }

  // Update file
  const { data: updated, error } = await db
    .from('files')
    .update({
      content,
      updated_by_id: user.id,
      updated_at: new Date().toISOString(),
      file_size_bytes: content.length
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !updated) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update file'
    })
  }

  return updated
})
