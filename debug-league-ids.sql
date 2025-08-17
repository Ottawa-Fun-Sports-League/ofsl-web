-- Check if any users have league_ids populated
SELECT 
    COUNT(*) as total_users,
    COUNT(league_ids) as users_with_league_ids,
    COUNT(CASE WHEN array_length(league_ids, 1) > 0 THEN 1 END) as users_with_populated_league_ids
FROM users;

-- Check specific users with league_ids
SELECT id, name, email, league_ids 
FROM users 
WHERE league_ids IS NOT NULL 
  AND array_length(league_ids, 1) > 0 
LIMIT 10;

-- Check if there are any individual leagues (team_registration = false)
SELECT id, name, team_registration, deposit_amount, sport_id
FROM leagues
WHERE team_registration = false
LIMIT 10;