-- Add league skill level information to team registration notifications
ALTER TABLE team_registration_notifications
  ADD COLUMN IF NOT EXISTS league_skill_level TEXT;

-- Backfill existing notification rows with available skill information
UPDATE team_registration_notifications n
SET league_skill_level = COALESCE(team_skill.name, league_primary_skill.name, league_multi_skill.name, 'Not specified')
FROM teams t
LEFT JOIN skills team_skill ON team_skill.id = t.skill_level_id
LEFT JOIN leagues l ON l.id = t.league_id
LEFT JOIN skills league_primary_skill ON league_primary_skill.id = l.skill_id
LEFT JOIN LATERAL (
  SELECT s.name
  FROM skills s
  WHERE l.skill_ids IS NOT NULL
    AND array_length(l.skill_ids, 1) > 0
    AND s.id = l.skill_ids[1]
  LIMIT 1
) AS league_multi_skill ON TRUE
WHERE n.team_id = t.id
  AND (n.league_skill_level IS NULL OR n.league_skill_level = '');

-- Ensure future team registrations capture the skill level
CREATE OR REPLACE FUNCTION queue_team_registration_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    captain_record RECORD;
    league_name TEXT;
    league_primary_skill_id BIGINT;
    league_skill_ids BIGINT[];
    league_skill_name TEXT;
    selected_skill_name TEXT;
BEGIN
    -- Only proceed for new teams (on INSERT)
    IF TG_OP != 'INSERT' THEN
        RETURN NEW;
    END IF;

    -- Get captain information
    SELECT name, email, phone INTO captain_record
    FROM users
    WHERE id = NEW.captain_id;

    -- Get league information including skill references
    SELECT name, skill_id, skill_ids INTO league_name, league_primary_skill_id, league_skill_ids
    FROM leagues
    WHERE id = NEW.league_id;

    -- Determine the skill level name
    IF NEW.skill_level_id IS NOT NULL THEN
        SELECT name INTO selected_skill_name FROM skills WHERE id = NEW.skill_level_id;
    END IF;

    IF selected_skill_name IS NULL AND league_primary_skill_id IS NOT NULL THEN
        SELECT name INTO league_skill_name FROM skills WHERE id = league_primary_skill_id;
    END IF;

    IF selected_skill_name IS NULL AND league_skill_name IS NULL AND league_skill_ids IS NOT NULL AND array_length(league_skill_ids, 1) > 0 THEN
        SELECT name INTO league_skill_name FROM skills WHERE id = league_skill_ids[1];
    END IF;

    -- Insert notification record
    INSERT INTO team_registration_notifications (
        team_id,
        team_name,
        captain_name,
        captain_email,
        captain_phone,
        league_name,
        registered_at,
        roster_count,
        league_skill_level
    ) VALUES (
        NEW.id,
        NEW.name,
        COALESCE(captain_record.name, 'Unknown'),
        COALESCE(captain_record.email, 'Unknown'),
        captain_record.phone,
        COALESCE(league_name, 'Unknown League'),
        NEW.created_at,
        COALESCE(array_length(NEW.roster, 1), 1),
        COALESCE(selected_skill_name, league_skill_name, 'Not specified')
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the team creation
        RAISE WARNING 'Failed to queue team registration notification: %', SQLERRM;
        RETURN NEW;
END;
$$;
