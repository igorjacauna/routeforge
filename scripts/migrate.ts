import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  console.error('Set NUXT_PUBLIC_SUPABASE_URL and NUXT_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const db = createClient(supabaseUrl, supabaseServiceKey)

async function getMigrationsToRun() {
  // Get list of migrations already applied
  const { data: appliedMigrations, error } = await db
    .from('_migrations')
    .select('name')
    .order('name')

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = relation does not exist (first migration)
    throw error
  }

  const appliedNames = new Set((appliedMigrations || []).map((m: any) => m.name))

  // Get list of migration files in server/migrations
  const migrationsDir = join(process.cwd(), 'server', 'migrations')
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  return files.filter((f) => !appliedNames.has(f))
}

async function runMigration(filename: string, sql: string) {
  try {
    // Create _migrations table if it doesn't exist
    await db.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS _migrations (
          id BIGSERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `
    }).catch(() => {
      // Table might already exist, ignore error
    })

    // Execute migration SQL
    const { error } = await db.rpc('exec', { sql })

    if (error) {
      throw error
    }

    // Record migration as applied
    await db.from('_migrations').insert({ name: filename })

    return true
  } catch (err) {
    console.error(`❌ Failed to run migration ${filename}:`, err)
    return false
  }
}

async function main() {
  try {
    console.log('🔍 Checking for pending migrations...')

    const migrationsToRun = await getMigrationsToRun()

    if (migrationsToRun.length === 0) {
      console.log('✅ No pending migrations')
      return
    }

    console.log(`📦 Found ${migrationsToRun.length} migration(s) to apply:`)
    migrationsToRun.forEach((m) => console.log(`  - ${m}`))
    console.log()

    let successCount = 0

    for (const filename of migrationsToRun) {
      const filepath = join(process.cwd(), 'server', 'migrations', filename)
      const sql = readFileSync(filepath, 'utf-8')

      console.log(`⏳ Applying ${filename}...`)

      const success = await runMigration(filename, sql)

      if (success) {
        console.log(`✅ Applied ${filename}`)
        successCount++
      } else {
        console.error(`❌ Failed ${filename}`)
        process.exit(1)
      }
    }

    console.log()
    console.log(`✅ Successfully applied ${successCount} migration(s)`)
  } catch (err) {
    console.error('❌ Migration error:', err)
    process.exit(1)
  }
}

main()
