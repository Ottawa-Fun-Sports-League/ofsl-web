-- Add display_order field to teams table for admin reordering functionality
-- This allows administrators to manually reorder teams in the admin interface

-- Add the display_order column
ALTER TABLE teams ADD COLUMN display_order INTEGER DEFAULT 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_teams_display_order ON teams(display_order);

-- Update existing teams to have sequential display_order based on creation date
-- This ensures existing teams have a proper order
WITH ordered_teams AS (
  SELECT id, row_number() OVER (PARTITION BY league_id ORDER BY created_at) as new_order
  FROM teams
  WHERE display_order = 0
)
UPDATE teams 
SET display_order = ordered_teams.new_order
FROM ordered_teams
WHERE teams.id = ordered_teams.id;

-- Add comment to document the column purpose
COMMENT ON COLUMN teams.display_order IS 'Order for displaying teams in admin interface. Lower values appear first.';