# Fix for League Update Error

## Problem
Getting "Failed to update league" error when editing league end date because the `playoff_weeks` column doesn't exist in the database yet.

## Solution
Run the migration to add the playoff_weeks column:

```bash
# Apply the playoff weeks migration
supabase db push

# Or apply migrations manually if needed
supabase migration up
```

## Alternative Manual Fix
If you can't run migrations right now, you can manually add the column in your Supabase dashboard:

1. Go to your Supabase dashboard
2. Navigate to the SQL editor
3. Run this SQL:

```sql
-- Add playoff_weeks column to leagues table
ALTER TABLE leagues 
ADD COLUMN IF NOT EXISTS playoff_weeks INTEGER DEFAULT 2;

-- Add check constraint to ensure playoff_weeks is reasonable (0-6 weeks)
ALTER TABLE leagues 
ADD CONSTRAINT leagues_playoff_weeks_check CHECK (playoff_weeks >= 0 AND playoff_weeks <= 6);

-- Update existing leagues to have default playoff weeks
UPDATE leagues 
SET playoff_weeks = 2 
WHERE playoff_weeks IS NULL;

-- Add is_playoff column to weekly_schedules table to identify playoff weeks
ALTER TABLE weekly_schedules 
ADD COLUMN IF NOT EXISTS is_playoff BOOLEAN DEFAULT FALSE;
```

## Temporary Workaround
I've also updated the code to be backward compatible - it will only include the `playoff_weeks` field if it's defined, so the update should work even without the migration.

Try updating the league again and check the browser console for any additional error details.