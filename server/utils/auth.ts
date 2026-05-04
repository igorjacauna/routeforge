import { serverSupabaseClient } from '#supabase/server'

export async function serverSupabaseUser(event: H3Event) {
  const client = await serverSupabaseClient(event)
  const {
    data: { user }
  } = await client.auth.getUser()
  return user
}
