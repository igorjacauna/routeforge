import type { SupabaseClient } from '@supabase/supabase-js'

export async function getPublicUserId(
  client: SupabaseClient,
  authUserId: string
): Promise<string | null> {
  const { data } = await client
    .from('users')
    .select('id')
    .eq('auth_id', authUserId)
    .single()
  return data?.id ?? null
}
