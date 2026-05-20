import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { token } = getRouterParams(event)

  const { data: invitation } = await db
    .from('workspace_invitations')
    .select('id, invited_email, role, status, expires_at, workspace_id, folder_id, workspaces(id, name), folders(id, name), users!workspace_invitations_invited_by_id_fkey(email, display_name, full_name)')
    .eq('token', token)
    .single()

  if (!invitation) {
    throw createError({ statusCode: 404, statusMessage: 'Invitation not found' })
  }

  const isExpired = invitation.expires_at
    ? new Date(invitation.expires_at) < new Date()
    : false

  return { ...invitation, isExpired }
})
