# Data Migration Guide - Main to Staging

This guide explains how to migrate data from your main Supabase database to your staging database.

## Current Status

✅ **Completed:**
- Staging database schema created successfully
- Sports table migrated (4 records)
- Skills table migrated (5 records)  
- Waivers table migrated (1 record)
- Environment variables updated in `.env.staging`

⏳ **Remaining:**
- Gyms (38 records)
- Users (499 records)
- Leagues (14 records)
- Teams (42 records)
- Other related tables

## Option 1: Using Supabase SQL Editor (Recommended)

1. **Get your main database password:**
   - Go to your main project in Supabase Dashboard
   - Navigate to Settings > Database
   - Copy your database password

2. **Run the migration script:**
   - Open your staging project SQL Editor
   - Copy the contents of `scripts/migrate_data_simple.sql`
   - Replace `YOUR_MAIN_DATABASE_PASSWORD_HERE` with your actual password
   - Run the script

3. **Verify the migration:**
   ```sql
   SELECT 
     'users' as table_name, COUNT(*) as count FROM users
   UNION ALL SELECT 'teams', COUNT(*) FROM teams
   UNION ALL SELECT 'leagues', COUNT(*) FROM leagues
   UNION ALL SELECT 'gyms', COUNT(*) FROM gyms
   ORDER BY table_name;
   ```

## Option 2: Using pg_dump and pg_restore

1. **Install PostgreSQL client tools** (if not already installed)

2. **Update the migration script:**
   - Edit `scripts/migrate_via_sql.sh`
   - Add your staging database password

3. **Run the migration:**
   ```bash
   chmod +x scripts/migrate_via_sql.sh
   ./scripts/migrate_via_sql.sh
   ```

## Option 3: Using Supabase Dashboard Export/Import

1. **Export from main:**
   - Go to your main project
   - Navigate to Table Editor
   - For each table, click Export > Export as CSV

2. **Import to staging:**
   - Go to your staging project
   - Navigate to Table Editor
   - For each table, click Import > Import CSV
   - Import in this order to respect foreign keys:
     1. sports, skills, gyms, waivers
     2. users
     3. leagues, seasons
     4. teams
     5. All other tables

## Important Notes

- Always migrate data in the correct order to respect foreign key constraints
- The sequences are automatically updated after migration
- RLS policies are already in place from the schema migration
- Test your application thoroughly after migration

## Troubleshooting

### Foreign Data Wrapper Authentication Issues
If you encounter authentication errors with postgres_fdw:
- Ensure the password doesn't contain special characters that need escaping
- Try using the connection string format instead
- Check if your projects are in the same region

### Missing Data
If some data doesn't migrate:
- Check for constraint violations in the logs
- Ensure all dependent data exists (e.g., users before teams)
- Verify the source data doesn't have null values in required fields

## Next Steps

After migration:
1. Update your Netlify environment variables for staging
2. Deploy your application to staging
3. Test all functionality with the migrated data
4. Set up automated sync if needed