-- Update weekly_schedules format constraint to include elite 3‑team formats
-- and keep it in sync with the app's supported formats.

-- Drop old constraint if it exists
ALTER TABLE weekly_schedules
  DROP CONSTRAINT IF EXISTS check_valid_format;

-- Recreate with full set of allowed formats
ALTER TABLE weekly_schedules 
  ADD CONSTRAINT check_valid_format 
  CHECK (
    format IN (
      '2-teams-4-sets',
      '2-teams-best-of-3',
      '2-teams-best-of-5',
      '2-teams-elite',
      '3-teams-6-sets',
      '3-teams-elite-6-sets',
      '3-teams-elite-9-sets',
      '4-teams-head-to-head',
      '6-teams-head-to-head'
    )
  );

-- Optional: ensure the capacity helper recognizes new formats
-- (Only needed if your DB already has this function; safe to run)
CREATE OR REPLACE FUNCTION validate_tier_team_capacity(
  p_tier_id INTEGER,
  p_new_format TEXT
)
RETURNS TABLE (
  is_valid BOOLEAN,
  current_team_count INTEGER,
  max_allowed_teams INTEGER,
  teams_that_would_be_removed TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
  current_teams TEXT[];
  format_capacity INTEGER;
BEGIN
  -- Get current teams for the tier
  SELECT ARRAY[
    team_a_name, team_b_name, team_c_name,
    team_d_name, team_e_name, team_f_name
  ]
  INTO current_teams
  FROM weekly_schedules
  WHERE id = p_tier_id;

  -- Remove null entries
  current_teams := ARRAY(SELECT unnest(current_teams) WHERE unnest IS NOT NULL);

  -- Compute capacity by format
  format_capacity := CASE 
    WHEN p_new_format IN ('2-teams-4-sets', '2-teams-best-of-3', '2-teams-best-of-5', '2-teams-elite') THEN 2
    WHEN p_new_format IN ('3-teams-6-sets', '3-teams-elite-6-sets', '3-teams-elite-9-sets') THEN 3
    WHEN p_new_format = '4-teams-head-to-head' THEN 4
    WHEN p_new_format = '6-teams-head-to-head' THEN 6
    ELSE 3
  END;

  RETURN QUERY
  SELECT 
    COALESCE(array_length(current_teams, 1), 0) <= format_capacity,
    COALESCE(array_length(current_teams, 1), 0),
    format_capacity,
    CASE 
      WHEN COALESCE(array_length(current_teams, 1), 0) > format_capacity 
      THEN current_teams[format_capacity + 1 : array_length(current_teams, 1)]
      ELSE ARRAY[]::TEXT[]
    END;
END;
$$;

