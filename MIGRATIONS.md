# Database Migrations Guide

## Overview

RouteForge uses a migration system that:
- Automatically applies migrations on push to `development` or `main` branches
- Tracks applied migrations in a `_migrations` table
- Can be run locally with `pnpm migrate`

## Workflow

### Local Development (Branch: `development`)

When working on the `development` branch:

1. **Create a new migration file** in `server/migrations/`:
   ```bash
   # File naming: XXX_description.sql (e.g., 002_add_user_preferences.sql)
   touch server/migrations/002_add_user_preferences.sql
   ```

2. **Write your SQL** in the migration file:
   ```sql
   -- Add preferences column to users
   ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}';
   CREATE INDEX idx_users_preferences ON users USING GIN (preferences);
   ```

3. **Test locally on development project**:
   ```bash
   # Apply migrations to your development Supabase project
   pnpm migrate:dev
   ```

4. **Commit and push to development**:
   ```bash
   git add server/migrations/002_add_user_preferences.sql
   git commit -m "feat: Add user preferences column"
   git push origin development
   ```

5. **Manual verification** (no automatic action):
   - You manually ran `pnpm migrate:dev` to test
   - Migration is confirmed to work in dev environment
   - Ready for production deployment

### Production Deployment (Branch: `main`)

When ready to deploy to production:

1. **Merge from `development` to `main`**:
   ```bash
   git checkout main
   git pull origin main
   git merge origin/development
   ```

2. **Push to main**:
   ```bash
   git push origin main
   ```

3. **GitHub Action runs automatically**:
   - Detects new migration files in `server/migrations/`
   - Applies them to the **production** Supabase project
   - Creates `_migrations` table if it doesn't exist (first time)
   - Records the migration as applied
   - Fails the build if migration fails (safe deployment)

## Setting Up GitHub Secrets

You need to configure secrets in your GitHub repository:

**For Development Environment:**
- `SUPABASE_URL_DEV` — Your dev Supabase project URL
- `SUPABASE_ANON_KEY_DEV` — Dev anon key
- `SUPABASE_SERVICE_ROLE_KEY_DEV` — Dev service role key

**For Production Environment:**
- `SUPABASE_URL_PROD` — Your prod Supabase project URL
- `SUPABASE_ANON_KEY_PROD` — Prod anon key
- `SUPABASE_SERVICE_ROLE_KEY_PROD` — Prod service role key

### How to Add Secrets

1. Go to **GitHub Repository Settings**
2. Click **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with the name and value

Example:
```
Name: SUPABASE_URL_DEV
Value: https://your-project.supabase.co
```

## Migration File Naming

Use this format for migration files:

```
XXX_description.sql
^^^
|-- Sequential number (001, 002, 003, etc.)
```

Examples:
- `001_create_initial_schema.sql`
- `002_add_user_preferences.sql`
- `003_create_share_links_table.sql`
- `004_add_rls_policies.sql`

## Running Migrations Locally

### Apply to Development Project
```bash
pnpm migrate:dev
```

### Apply to Production Project
```bash
pnpm migrate:prod
```

### Apply to Current Project (via env vars)
```bash
export NUXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export NUXT_SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

pnpm migrate
```

## Migration Tracking

Migrations are tracked in the `_migrations` table:

```sql
SELECT * FROM _migrations;
-- Returns:
-- id | name | executed_at
-- 1  | 001_create_initial_schema.sql | 2024-04-30 14:30:00
-- 2  | 002_add_user_preferences.sql  | 2024-04-30 14:35:00
```

## Rollback (Manual)

Since this is a forward-only migration system, rollbacks are manual:

1. **Create a new migration** with the rollback SQL:
   ```sql
   -- 003_rollback_preferences.sql
   ALTER TABLE users DROP COLUMN preferences;
   DROP INDEX idx_users_preferences;
   ```

2. **Run the migration**:
   ```bash
   pnpm migrate
   ```

## Best Practices

✅ **DO:**
- Write idempotent migrations (use `IF NOT EXISTS`, `IF EXISTS`)
- Test migrations locally before pushing
- Keep migrations small and focused
- Use descriptive filenames
- Add comments explaining the purpose

❌ **DON'T:**
- Modify old migration files (create new ones for rollbacks)
- Add schema changes to multiple migrations unnecessarily
- Use non-idempotent SQL (will fail on re-runs)

## Example: Idempotent Migration

```sql
-- ✅ GOOD: Idempotent (can be run multiple times)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ❌ BAD: Not idempotent (fails if table exists)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255)
);
```

## Troubleshooting

### Migration fails locally

1. Check Supabase credentials in `.env.local`
2. Verify the service role key has admin permissions
3. Check SQL syntax errors in the migration file
4. Review the `_migrations` table to see what's been applied

### GitHub Action doesn't run

1. Check that you've added all required secrets
2. Verify the migration files are in `server/migrations/` and end with `.sql`
3. Check the workflow file path: `.github/workflows/database-migrate.yml`
4. View Action logs in GitHub: **Actions** tab → **Database Migration**

### Secrets not found

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Verify all 6 secrets are present
3. Secrets are case-sensitive: `SUPABASE_URL_DEV` ≠ `supabase_url_dev`

## Integration with CI/CD

Migrations run **before deployment**:

1. Push code to `development` or `main`
2. GitHub Action applies migrations
3. After migrations succeed, deployment can proceed
4. If migrations fail, workflow stops (no bad deploys)

## See Also

- [Supabase Migration Documentation](https://supabase.com/docs/guides/migrations)
- [Database Schema](../techspec.md#2-database-schema)
