import 'dotenv/config'
import { execa } from 'execa'

const projectRef = process.env.SUPABASE_PROJECT_REF
const accessToken = process.env.NUXT_SUPABASE_SECRET_KEY

if (!projectRef) {
  console.error('❌ Missing SUPABASE_PROJECT_REF')
  console.error('Set SUPABASE_PROJECT_REF in .env or pass as env var')
  process.exit(1)
}

if (!accessToken) {
  console.error('❌ Missing NUXT_SUPABASE_SECRET_KEY')
  console.error('Set NUXT_SUPABASE_SECRET_KEY in .env or pass as env var')
  process.exit(1)
}

try {
  console.log(`🔗 Linking to project: ${projectRef}`)
  await execa('supabase', ['link', '--project-ref', projectRef], {
    stdio: 'inherit',
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: accessToken }
  })

  console.log('📦 Pushing migrations...')
  await execa('supabase', ['db', 'push', '--linked', '--yes'], {
    stdio: 'inherit',
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: accessToken }
  })

  console.log('✅ Migrations applied successfully')
} catch (err) {
  console.error('❌ Migration failed')
  if (err instanceof Error) {
    console.error('Error:', err.message)
  }
  process.exit(1)
}
