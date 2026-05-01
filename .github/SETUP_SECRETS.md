# GitHub Actions - Setup Secrets

Configure GitHub secrets for automatic database migrations using Supabase CLI.

## Quick Setup

### 1. Get Supabase Credentials

Go to [Supabase Dashboard](https://app.supabase.com):

1. Click your **production** project
2. Go to **Project Settings** → **General**
3. Copy **Project Reference** (e.g., `abcdefghijklmnop`)

For **Access Token**:
1. Click your avatar (bottom left)
2. Go to **Access Tokens**
3. Click **Generate New Token**
4. Name it "GitHub Actions"
5. Copy the token

### 2. Add Secrets to GitHub

1. Go to your repository on GitHub
2. Click **Settings** (top navigation)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret**

Add these **2 secrets**:

| Secret Name | Value |
|-------------|-------|
| `SUPABASE_PROD_PROJECT_REF` | Your prod project reference (e.g., `abcdefghijklmnop`) |
| `SUPABASE_ACCESS_TOKEN` | Your personal access token ⚠️ Keep secret! |

**Note:** Dev secrets go in `.env.local` for local testing with `pnpm migrate:dev`.

### 3. Verify Setup

1. Go to **Actions** tab in GitHub
2. Click **DB Migrate** workflow
3. Check that the latest run succeeded

## How It Works

When you push to `main`:

```
Push code to main
  ↓
GitHub detects new .sql files in supabase/migrations/
  ↓
Runs DB Migrate action
  ↓
Links to prod project (SUPABASE_PROD_PROJECT_REF)
  ↓
Authenticates (SUPABASE_ACCESS_TOKEN)
  ↓
Runs: supabase db push --linked --yes
  ↓
Applies migrations automatically
  ↓
✅ Done (or ❌ Failed)
```

## Testing Locally

Add to `.env.local`:

```
SUPABASE_DEV_PROJECT_REF=your-dev-project-ref
SUPABASE_ACCESS_TOKEN=your-access-token
```

Then run:

```bash
pnpm migrate:dev
```

## Common Issues

### "Project not linked"

```bash
# Make sure you're linked to the right project
supabase link --project-ref your-project-ref
```

### "Unauthorized" error

- Verify `SUPABASE_ACCESS_TOKEN` is valid
- Check token hasn't been revoked in Supabase dashboard
- Regenerate token if needed

### Workflow doesn't trigger

- Files must be in `supabase/migrations/` directory
- Files must end with `.sql` extension
- File names must start with timestamp: `20260430120000_description.sql`
- Check workflow file: `.github/workflows/database-migrate.yml`

## Security Best Practices

✅ **DO:**
- Rotate access tokens periodically
- Use different tokens for dev and prod
- Don't commit secrets to git
- Review who has access to GitHub secrets

❌ **DON'T:**
- Share access tokens publicly
- Use same token for multiple projects
- Log or print secrets in code
- Commit `.env.local` files with real credentials

## Additional Resources

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [Supabase API Reference](https://supabase.com/docs/reference/api)
- [Migrations Guide](../MIGRATIONS.md)
