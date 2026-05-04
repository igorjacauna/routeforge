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

  const body = await readBody(event)
  const { name } = body
  const parentFolderId: string | null | undefined =
    body.parentFolderId === '' ? null : body.parentFolderId

  if (!name && parentFolderId === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No fields to update'
    })
  }

  try {
    const client = await serverSupabaseClient(event)

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

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (name) {
      updateData.name = name.trim()
    }

    if (parentFolderId !== undefined) {
      if (parentFolderId !== null) {
        if (parentFolderId === folderId) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Cannot move a folder into itself'
          })
        }

        const { data: targetFolder, error: folderError } = await client
          .from('folders')
          .select('id')
          .eq('id', parentFolderId)
          .eq('workspace_id', folder.workspace_id)
          .single()

        if (folderError || !targetFolder) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Target folder not found or does not belong to this workspace'
          })
        }
      }
      updateData.parent_folder_id = parentFolderId || null
    }

    const { data: updated, error: updateError } = await client
      .from('folders')
      .update(updateData)
      .eq('id', folderId)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === '23505') {
        throw createError({
          statusCode: 409,
          statusMessage: 'A folder with this name already exists in the target location'
        })
      }
      throw updateError
    }

    if (!updated) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update folder'
      })
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
