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

  const body = await readBody(event)
  const { content, name } = body
  const folderId: string | null | undefined =
    body.folderId === '' ? null : body.folderId

  if (!content && !name && folderId === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No fields to update'
    })
  }

  try {
    const client = await serverSupabaseClient(event)

    const { data: file, error: getError } = await client
      .from('files')
      .select('workspace_id, folder_id')
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
        statusMessage: 'Access denied'
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
        statusMessage: 'Access denied'
      })
    }

    const updateData: Record<string, unknown> = {
      updated_by_id: publicUserId,
      updated_at: new Date().toISOString()
    }

    if (content) {
      updateData.content = content
      updateData.file_size_bytes = content.length
    }

    if (name) {
      updateData.name = name
    }

    if (folderId !== undefined) {
      if (folderId !== null) {
        const { data: targetFolder, error: folderError } = await client
          .from('folders')
          .select('id')
          .eq('id', folderId)
          .eq('workspace_id', file.workspace_id)
          .single()

        if (folderError || !targetFolder) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Target folder not found or does not belong to this workspace'
          })
        }
      }
      updateData.folder_id = folderId || null
    }

    const { data: updated, error: updateError } = await client
      .from('files')
      .update(updateData)
      .eq('id', fileId)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === '23505') {
        throw createError({
          statusCode: 409,
          statusMessage: 'A file with this name already exists in the target folder'
        })
      }
      throw updateError
    }

    if (!updated) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update file'
      })
    }

    return updated
  } catch (error) {
    console.error('Update file error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update file'
    })
  }
})
