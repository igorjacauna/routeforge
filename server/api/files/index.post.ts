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

  const { workspaceId, name, folderId } = await readBody(event)

  if (!workspaceId || !name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields'
    })
  }

  try {
    const client = await serverSupabaseClient(event)
    const publicUserId = await getPublicUserId(client, user.id)

    if (!publicUserId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied'
      })
    }

    const { data: workspace } = await client
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .eq('owner_id', publicUserId)
      .single()

    if (!workspace) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied'
      })
    }

    const { data: file, error } = await client
      .from('files')
      .insert({
        workspace_id: workspaceId,
        folder_id: folderId || null,
        name,
        content: '',
        created_by_id: publicUserId,
        updated_by_id: publicUserId
      })
      .select()
      .single()

    if (error || !file) {
      throw error || new Error('Failed to create file')
    }

    return file
  } catch (error) {
    console.error('Create file error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create file'
    })
  }
})
