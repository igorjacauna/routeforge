import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration')
}

export const db = createClient(supabaseUrl, supabaseServiceKey)
