import { randomBytes } from 'node:crypto'
import { serverSupabaseClient } from '#supabase/server'
import { serverSupabaseUser } from '~~/server/utils/auth'
import { getPublicUserId } from '~~/server/utils/publicUser'
import { sendInvitationEmail } from '~~/server/utils/email'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const authUser = await serverSupabaseUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { id: workspaceId } = getRouterParams(event)
  const body = await readBody(event)
  const { email, role = 'editor', folderId } = body

  if (!email || typeof email !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Email is required' })
  }
  if (!['editor', 'viewer'].includes(role)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid role' })
  }

  const client = await serverSupabaseClient(event)
  const publicUserId = await getPublicUserId(client, authUser.id)
  if (!publicUserId) throw createError({ statusCode: 403, statusMessage: 'Access denied' })

  const { data: workspace } = await db
    .from('workspaces')
    .select('id, name')
    .eq('id', workspaceId)
    .eq('owner_id', publicUserId)
    .single()

  if (!workspace) throw createError({ statusCode: 403, statusMessage: 'Access denied' })

  // Valida a pasta se fornecida
  let folderName: string | null = null
  if (folderId) {
    const { data: folder } = await db
      .from('folders').select('id, name')
      .eq('id', folderId).eq('workspace_id', workspaceId).single()
    if (!folder) throw createError({ statusCode: 404, statusMessage: 'Folder not found' })
    folderName = folder.name
  }

  const { data: inviter } = await db
    .from('users').select('email, display_name, full_name').eq('id', publicUserId).single()

  const inviterName = inviter?.display_name || inviter?.full_name || inviter?.email || 'Alguém'
  const normalizedEmail = email.toLowerCase().trim()

  if (authUser.email?.toLowerCase() === normalizedEmail) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot invite yourself' })
  }

  // Verifica se já é membro
  const { data: existingUser } = await db
    .from('users').select('id').eq('email', normalizedEmail).single()

  if (existingUser) {
    const memberQuery = db
      .from('team_members').select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', existingUser.id)

    if (folderId) {
      memberQuery.eq('folder_id', folderId)
    } else {
      memberQuery.is('folder_id', null)
    }

    const { data: existingMember } = await memberQuery.single()
    if (existingMember) {
      throw createError({ statusCode: 409, statusMessage: 'User is already a member' })
    }
  }

  // Verifica convite pendente duplicado
  const inviteQuery = db
    .from('workspace_invitations').select('id')
    .eq('workspace_id', workspaceId)
    .eq('invited_email', normalizedEmail)
    .eq('status', 'pending')

  if (folderId) {
    inviteQuery.eq('folder_id', folderId)
  } else {
    inviteQuery.is('folder_id', null)
  }

  const { data: existingInvite } = await inviteQuery.single()
  if (existingInvite) {
    throw createError({ statusCode: 409, statusMessage: 'Invitation already sent' })
  }

  const token = randomBytes(32).toString('hex')

  const { data: invitation, error } = await db
    .from('workspace_invitations')
    .insert({
      workspace_id: workspaceId,
      invited_email: normalizedEmail,
      invited_by_id: publicUserId,
      role,
      token,
      folder_id: folderId || null,
    })
    .select('token')
    .single()

  if (error || !invitation) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create invitation' })
  }

  const origin = getRequestURL(event).origin
  const inviteUrl = `${origin}/invite/${invitation.token}`

  await sendInvitationEmail({
    toEmail: normalizedEmail,
    inviterName,
    workspaceName: workspace.name,
    folderName,
    role,
    inviteUrl,
  })

  return { success: true }
})
