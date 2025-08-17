-- Migrate existing badminton registrations from team-based to individual

-- Step 1: Add league_ids to users for their badminton registrations
UPDATE users u
SET league_ids = array_cat(
  COALESCE(u.league_ids, '{}'), 
  ARRAY(
    SELECT DISTINCT t.league_id
    FROM teams t
    JOIN leagues l ON t.league_id = l.id
    JOIN sports s ON l.sport_id = s.id
    WHERE s.name = 'Badminton'
    AND u.id = t.captain_id
  )
);

-- Step 2: Update payment records to remove team association for badminton
UPDATE league_payments lp
SET team_id = NULL
FROM teams t
JOIN leagues l ON t.league_id = l.id  
JOIN sports s ON l.sport_id = s.id
WHERE lp.team_id = t.id
AND s.name = 'Badminton';

-- Step 3: Remove badminton team IDs from users.team_ids array
UPDATE users u
SET team_ids = ARRAY(
  SELECT unnest(u.team_ids)
  EXCEPT
  SELECT t.id
  FROM teams t
  JOIN leagues l ON t.league_id = l.id
  JOIN sports s ON l.sport_id = s.id
  WHERE s.name = 'Badminton'
);

-- Step 4: Delete all badminton teams
DELETE FROM teams t
USING leagues l, sports s
WHERE t.league_id = l.id
AND l.sport_id = s.id
AND s.name = 'Badminton';

-- Log the migration
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT u.id) INTO migrated_count
  FROM users u
  WHERE array_length(u.league_ids, 1) > 0;
  
  RAISE NOTICE 'Migrated % users to individual badminton registrations', migrated_count;
END $$;