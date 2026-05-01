# Database Migrations Guide

## Overview

RouteForge uses Supabase CLI for migrations:
- Migrations stored in `supabase/migrations/`
- Applied via `supabase db push` command
- Automatic CI/CD on push to `main` branch
- Local development with `pnpm migrate:dev`

## Workflow

### Local Development

1. **Create a new migration file** in `supabase/migrations/`:
   ```bash
   # File naming follows Supabase convention: timestamp_description.sql
   touch supabase/migrations/20260430120000_add_user_preferences.sql
   ```

2. **Write your SQL** in the migration file:
   ```sql
   -- Add preferences column to users
   ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}';
   CREATE INDEX idx_users_preferences ON users USING GIN (preferences);
   ```

3. **Test locally**:
   ```bash
   # Set your dev project ref in .env.local
   SUPABASE_DEV_PROJECT_REF=your-dev-project-ref
   SUPABASE_ACCESS_TOKEN=your-access-token
   
   # Apply migrations to development Supabase project
   pnpm migrate:dev
   ```

4. **Commit and push**:
   ```bash
   git add supabase/migrations/20260430120000_add_user_preferences.sql
   git commit -m "feat: Add user preferences column"
   git push origin your-branch
   ```

### Production Deployment (Branch: `main`)

When ready to deploy to production:

1. **Merge to `main`**:
   ```bash
   git checkout main
   git pull origin main
   git merge origin/your-branch
   ```

2. **Push to main**:
   ```bash
   git push origin main
   ```

3. **GitHub Action runs automatically**:
   - Detects new migration files in `supabase/migrations/`
   - Links production Supabase project using `SUPABASE_ACCESS_TOKEN`
   - Applies migrations via `supabase db push --linked`
   - Fails if any migration fails (safe deployment)

## Setting Up GitHub Secrets

For GitHub Actions CI/CD, add these **2 secrets** in repository settings:

**Required for CI/CD:**
- `SUPABASE_PROD_PROJECT_REF` — Your production project reference (e.g., `abcdefghijklmnop`)
- `SUPABASE_ACCESS_TOKEN` — Personal access token from Supabase dashboard

**For Local Development (in `.env.local`):**
```
SUPABASE_DEV_PROJECT_REF=your-dev-project-ref
SUPABASE_ACCESS_TOKEN=your-access-token
```

### Getting Tokens

1. **Project Ref**: Go to Supabase Dashboard → Project Settings → General (at the top)
2. **Access Token**: Go to Supabase Dashboard → Account → Access Tokens

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

Supabase uses timestamp-based naming:

```
20260430120000_description.sql
^^^^^^^^^^^^^^^^
|-- ISO 8601 timestamp (YYYYMMDDhhmmss)
```

Examples:
- `20260430100000_create_initial_schema.sql`
- `20260430110000_add_auth_trigger.sql`
- `20260501080000_add_user_preferences.sql`

**Why timestamps?** Prevents naming conflicts when multiple developers create migrations simultaneously.

## Running Migrations Locally

### Apply to Development Project
```bash
# Ensure .env.local has:
# SUPABASE_DEV_PROJECT_REF=your-dev-project-ref
# SUPABASE_ACCESS_TOKEN=your-access-token

pnpm migrate:dev
```

### Apply to Production Project (for testing)
```bash
# Ensure .env.local has:
# SUPABASE_PROD_PROJECT_REF=your-prod-project-ref
# SUPABASE_ACCESS_TOKEN=your-access-token

pnpm migrate:prod
```

### Manual Migration (Direct CLI)
```bash
# Requires Supabase CLI installed: npm i -g supabase
supabase link --project-ref your-project-ref
supabase db push --linked
```

## Migration Tracking

Supabase CLI automatically tracks applied migrations in the `schema_migrations` table:

```sql
SELECT * FROM schema_migrations;
-- Returns:
-- version | name | success | executed_at
-- 1  | 20260430100000_create_initial_schema | true | 2026-04-30 10:00:00
-- 2  | 20260430110000_add_auth_trigger     | true | 2026-04-30 11:00:00
```

No manual tracking needed — the CLI handles it.

## Rollback (Manual)

Supabase uses forward-only migrations. To rollback:

1. **Create a new migration** with the rollback SQL:
   ```sql
   -- 20260430130000_rollback_preferences.sql
   ALTER TABLE users DROP COLUMN preferences;
   DROP INDEX idx_users_preferences;
   ```

2. **Run the migration**:
   ```bash
   pnpm migrate:dev
   ```

**Note:** There's no automatic rollback — each migration is permanent. Design migrations carefully and test locally first.

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

1. Ensure Supabase CLI is installed: `pnpm i -g supabase`
2. Check `.env.local` has valid `SUPABASE_DEV_PROJECT_REF` and `SUPABASE_ACCESS_TOKEN`
3. Check SQL syntax — Supabase will report syntax errors clearly
4. Verify the migration file is in `supabase/migrations/` with `.sql` extension
5. Check that the file name follows timestamp format: `20260430120000_description.sql`

**Debug:**
```bash
supabase status  # Check if linked correctly
supabase db list  # List applied migrations
```

### GitHub Action doesn't run

1. Verify migration files are in `supabase/migrations/` with `.sql` extension
2. Check the workflow file: `.github/workflows/database-migrate.yml`
3. View Action logs: **GitHub** → **Actions** tab → **DB Migrate**

### "Project not linked" error

```bash
# Verify you're linked to the correct project
supabase status

# Re-link if needed
supabase link --project-ref your-project-ref
```

### Secrets not found in GitHub

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add these 2 secrets:
   - `SUPABASE_PROD_PROJECT_REF` (your production project reference)
   - `SUPABASE_ACCESS_TOKEN` (personal access token)
3. Secrets are case-sensitive

## Integration with CI/CD

Migrations run **before deployment**:

1. Push code to `development` or `main`
2. GitHub Action applies migrations
3. After migrations succeed, deployment can proceed
4. If migrations fail, workflow stops (no bad deploys)

## See Also

- [Supabase Migration Documentation](https://supabase.com/docs/guides/migrations)
- [Database Schema](../techspec.md#2-database-schema)
