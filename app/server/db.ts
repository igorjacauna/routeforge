import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseSecretKey = process.env.NUXT_SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error('Missing Supabase configuration. Ensure NUXT_PUBLIC_SUPABASE_URL and NUXT_SUPABASE_SECRET_KEY are set.')
}

// Server-side admin client using service role key
export const db = createClient(supabaseUrl, supabaseSecretKey)
