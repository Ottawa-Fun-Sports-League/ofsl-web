-- Add league_points to store computed weekly points per team (e.g., 5/4/3 + tier bonus)
ALTER TABLE game_results
ADD COLUMN IF NOT EXISTS league_points INTEGER;

COMMENT ON COLUMN game_results.league_points IS 'Computed weekly league points for the team for this week/tier (5/4/3 + tier bonus). Used for accurate edit adjustments.';

