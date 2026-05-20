import { serverSupabaseClient } from '#supabase/server'
import { serverSupabaseUser } from '~~/server/utils/auth'
import { getPublicUserId } from '~~/server/utils/publicUser'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const client = await serverSupabaseClient(event)
  const publicUserId = await getPublicUserId(client, user.id)
  if (!publicUserId) throw createError({ statusCode: 403, statusMessage: 'Access denied' })

  const [{ data: owned }, { data: memberships }] = await Promise.all([
    client
      .from('workspaces')
      .select('id, name')
      .eq('owner_id', publicUserId)
      .order('created_at', { ascending: true }),
    client
      .from('team_members')
      .select('folder_id, workspaces(id, name)')
      .eq('user_id', publicUserId)
      .eq('status', 'accepted')
      .is('folder_id', null), // apenas membros workspace-level aparecem no switcher
  ])

  const ownedList = (owned || []).map(w => ({ ...w, isOwner: true }))

  const sharedList = (memberships || [])
    .map((m: any) => m.workspaces)
    .filter(Boolean)
    .filter((w: any) => !ownedList.some(o => o.id === w.id))
    .map((w: any) => ({ ...w, isOwner: false }))

  return [...ownedList, ...sharedList]
})
