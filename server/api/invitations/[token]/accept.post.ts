import { serverSupabaseClient } from '#supabase/server'
import { serverSupabaseUser } from '~~/server/utils/auth'
import { getPublicUserId } from '~~/server/utils/publicUser'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const authUser = await serverSupabaseUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { token } = getRouterParams(event)

  const { data: invitation } = await db
    .from('workspace_invitations')
    .select('id, workspace_id, folder_id, invited_email, role, status, expires_at')
    .eq('token', token)
    .single()

  if (!invitation) throw createError({ statusCode: 404, statusMessage: 'Invitation not found' })

  if (invitation.status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: 'Invitation already used' })
  }

  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    throw createError({ statusCode: 410, statusMessage: 'Invitation expired' })
  }

  if (authUser.email?.toLowerCase() !== invitation.invited_email) {
    throw createError({ statusCode: 403, statusMessage: 'This invitation was sent to a different email address' })
  }

  const client = await serverSupabaseClient(event)
  const publicUserId = await getPublicUserId(client, authUser.id)
  if (!publicUserId) throw createError({ statusCode: 403, statusMessage: 'User profile not found' })

  // Verifica se já é membro com esse mesmo nível de acesso
  const memberQuery = db
    .from('team_members').select('id')
    .eq('workspace_id', invitation.workspace_id)
    .eq('user_id', publicUserId)

  if (invitation.folder_id) {
    memberQuery.eq('folder_id', invitation.folder_id)
  } else {
    memberQuery.is('folder_id', null)
  }

  const { data: existingMember } = await memberQuery.single()

  if (!existingMember) {
    const { error } = await db
      .from('team_members')
      .insert({
        workspace_id: invitation.workspace_id,
        user_id: publicUserId,
        role: invitation.role,
        folder_id: invitation.folder_id || null,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to add member' })
  }

  await db
    .from('workspace_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitation.id)

  return { workspace_id: invitation.workspace_id }
})
