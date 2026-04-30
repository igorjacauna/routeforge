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

  // Verify user owns this workspace
  const { data: workspace, error: workspaceError } = await db
    .from('workspaces')
    .select('id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (workspaceError || !workspace) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied'
    })
  }

  // Get all files and folders in workspace
  const { data: files, error: filesError } = await db
    .from('files')
    .select('*')
    .eq('workspace_id', id)

  const { data: folders, error: foldersError } = await db
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
    workspace: {
      id: workspace.id
    },
    files: files || [],
    folders: folders || []
  }
})
