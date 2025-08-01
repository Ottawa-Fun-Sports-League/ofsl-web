# GitHub Secrets Update - New Staging Branch

The staging branch has been recreated. Please update your GitHub secrets with the new values:

## Updated Staging Secrets

```bash
STAGING_SUPABASE_URL=https://ozavwallbnysrrhdxplx.supabase.co
STAGING_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96YXZ3YWxsYm55c3JyaGR4cGx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNjY1NDIsImV4cCI6MjA2OTY0MjU0Mn0.z_JimDwGMjKnh65vDAIuKnkioS93pBFafTGrn2Va0Dg
```

## Using GitHub CLI

If you have GitHub CLI installed:

```bash
gh secret set STAGING_SUPABASE_URL --body="https://ozavwallbnysrrhdxplx.supabase.co"
gh secret set STAGING_SUPABASE_ANON_KEY --body="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96YXZ3YWxsYm55c3JyaGR4cGx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNjY1NDIsImV4cCI6MjA2OTY0MjU0Mn0.z_JimDwGMjKnh65vDAIuKnkioS93pBFafTGrn2Va0Dg"
```

## Branch Details

- **Project ID**: ozavwallbnysrrhdxplx
- **URL**: https://ozavwallbnysrrhdxplx.supabase.co
- **Status**: Created from main branch with migration fixes