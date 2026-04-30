# GitHub Actions - Setup Secrets

This guide explains how to configure GitHub repository secrets for automatic database migrations.

## Quick Setup

### 1. Get Supabase Credentials

For **production** Supabase project:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your **production** project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL_PROD`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY_PROD`

⚠️ **Important:** Use `service_role` key (not anon key) for migrations!

For **development** Supabase project (local use only):

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your **development** project
3. Go to **Settings** → **API**
4. Copy the same keys for local testing

### 2. Add Secrets to GitHub

1. Go to your repository on GitHub
2. Click **Settings** (top navigation)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret**

Add these **2 production secrets**:

| Secret Name | Value |
|-------------|-------|
| `SUPABASE_URL_PROD` | Your prod project URL (https://...) |
| `SUPABASE_SERVICE_ROLE_KEY_PROD` | Prod service_role key ⚠️ Keep secret! |

**Note:** Development secrets are NOT needed in GitHub (migrations only run on `main`). Use them locally with `pnpm migrate:dev`.

### 3. Verify Setup

1. Go to **Actions** tab in GitHub
2. Click **Database Migration** workflow
3. Check that the latest run succeeded

## How It Works

When you push to `development` or `main`:

```
Push code
  ↓
GitHub detects new .sql files in server/migrations/
  ↓
Runs Database Migration action
  ↓
Uses SUPABASE_URL_DEV or SUPABASE_URL_PROD
  ↓
Uses SUPABASE_SERVICE_ROLE_KEY_DEV or _PROD
  ↓
Applies migrations
  ↓
Records in _migrations table
  ↓
✅ Done (or ❌ Failed)
```

## Testing Locally

To test migrations before pushing:

```bash
# Development environment
export NUXT_PUBLIC_SUPABASE_URL="https://your-dev-project.supabase.co"
export NUXT_SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
pnpm migrate

# Or use the shorthand
pnpm migrate:dev
```

## Common Issues

### "Missing Supabase configuration"

- Verify all 6 secrets are added
- Check secret names are **exactly** as listed above (case-sensitive)
- Restart the workflow after adding secrets

### "Failed to authenticate"

- Verify you're using `service_role` key, not `anon` key
- Check the key hasn't expired in Supabase dashboard

### Workflow doesn't trigger

- File must be in `server/migrations/` directory
- File must end with `.sql` extension
- Check the workflow file exists: `.github/workflows/database-migrate.yml`

## Secrets Reference

### Why service_role key?

- `anon` key: Limited access (for frontend use)
- `service_role` key: Full admin access (for backend/migrations)

Migrations need admin access to:
- Create/alter tables
- Create indexes
- Manage roles and permissions
- Execute DDL (Data Definition Language)

### Security Best Practices

✅ **DO:**
- Use `service_role` key only for migrations
- Rotate keys periodically
- Use different keys for dev and prod
- Don't commit secrets to git

❌ **DON'T:**
- Share service_role key publicly
- Use same key for frontend and backend
- Put secrets in `.env` files (use GitHub Secrets)
- Log or print secrets in code

## Additional Resources

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [Supabase API Reference](https://supabase.com/docs/reference/api)
- [Migrations Guide](../MIGRATIONS.md)
