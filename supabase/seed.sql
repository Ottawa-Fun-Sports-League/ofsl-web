-- Seed data for local development
-- This creates test data to work with the volleyball features

-- Insert test sports
INSERT INTO sports (id, name) VALUES 
(1, 'Volleyball'),
(2, 'Badminton')
ON CONFLICT (id) DO NOTHING;

-- Insert test gyms
INSERT INTO gyms (id, gym, address, instructions, locations) VALUES 
(1, 'Test Volleyball Gym', '123 Test Street, Ottawa', 'Use main entrance', ARRAY['Court 1', 'Court 2', 'Court 3']),
(2, 'Community Center', '456 Community Ave, Ottawa', 'Side entrance after 6pm', ARRAY['Court A', 'Court B'])
ON CONFLICT (id) DO NOTHING;

-- Insert test users (admins and facilitators)
INSERT INTO users (id, name, email, is_admin, is_facilitator) VALUES 
('admin-user-1', 'Admin User', 'admin@test.com', true, true),
('facilitator-1', 'John Facilitator', 'facilitator1@test.com', false, true),
('facilitator-2', 'Jane Facilitator', 'facilitator2@test.com', false, true),
('captain-1', 'Team Captain 1', 'captain1@test.com', false, false),
('captain-2', 'Team Captain 2', 'captain2@test.com', false, false),
('captain-3', 'Team Captain 3', 'captain3@test.com', false, false),
('captain-4', 'Team Captain 4', 'captain4@test.com', false, false),
('captain-5', 'Team Captain 5', 'captain5@test.com', false, false),
('captain-6', 'Team Captain 6', 'captain6@test.com', false, false)
ON CONFLICT (id) DO NOTHING;

-- Insert test league
INSERT INTO leagues (id, name, description, sport_id, skill_id, start_date, end_date, cost, max_teams, gym_ids, sport_name) VALUES 
(1, 'Test Volleyball League', 'A test volleyball league for development', 1, 1, '2025-01-06', '2025-03-31', 150.00, 18, ARRAY[1, 2], 'Volleyball')
ON CONFLICT (id) DO NOTHING;

-- Insert test teams
INSERT INTO teams (id, name, captain_id, league_id, created_at) VALUES 
(1, 'Spike Masters', 'captain-1', 1, NOW()),
(2, 'Net Warriors', 'captain-2', 1, NOW()),
(3, 'Block Party', 'captain-3', 1, NOW()),
(4, 'Dig Deep', 'captain-4', 1, NOW()),
(5, 'Serve Strong', 'captain-5', 1, NOW()),
(6, 'Set Point', 'captain-6', 1, NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test matches (Week 1)
INSERT INTO matches (id, league_id, week_number, match_date, tier, position_a, position_b, position_c, gym_id, court, time_slot, match_format, status, facilitator_id, template_id, created_at, updated_at) VALUES 
(1, 1, 1, '2025-01-06', 1, 1, 2, 3, 1, 'Court 1', '19:00:00', 'round_robin_3', 'scheduled', 'facilitator-1', 1, NOW(), NOW()),
(2, 1, 1, '2025-01-06', 2, 4, 5, 6, 1, 'Court 2', '19:00:00', 'round_robin_3', 'scheduled', 'facilitator-2', 1, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test match sets (for completed match example)
-- First, let's mark one match as completed
UPDATE matches SET status = 'completed', completed_at = NOW() WHERE id = 1;

-- Add some sets for the completed match
INSERT INTO match_sets (id, match_id, set_number, team_a_score, team_b_score, team_c_score, completed_at) VALUES 
(1, 1, 1, 25, 20, 15, NOW()),
(2, 1, 2, 22, 25, 18, NOW()),
(3, 1, 3, 25, 23, 12, NOW())
ON CONFLICT (id) DO NOTHING;

-- Update match totals based on sets (this would normally be done by triggers)
UPDATE matches SET 
  team_a_total_points = 72,
  team_b_total_points = 68,
  team_c_total_points = 45,
  team_a_sets_won = 2,
  team_b_sets_won = 1,
  team_c_sets_won = 0,
  updated_at = NOW()
WHERE id = 1;

-- Insert initial standings (this would normally be calculated)
INSERT INTO league_standings (id, league_id, team_id, week_number, current_tier, tier_rank, matches_played, matches_won, matches_lost, sets_played, sets_won, sets_lost, points_for, points_against, point_differential, match_win_percentage, set_win_percentage, calculated_at) VALUES 
(1, 1, 1, 1, 1, 1, 1, 1, 0, 3, 2, 1, 72, 113, -41, 1.000, 0.667, NOW()),
(2, 1, 2, 1, 1, 2, 1, 0, 1, 3, 1, 2, 68, 117, -49, 0.000, 0.333, NOW()),
(3, 1, 3, 1, 1, 3, 1, 0, 1, 3, 0, 3, 45, 140, -95, 0.000, 0.000, NOW()),
(4, 1, 4, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.000, 0.000, NOW()),
(5, 1, 5, 1, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.000, 0.000, NOW()),
(6, 1, 6, 1, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.000, 0.000, NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert some tier history
INSERT INTO tier_history (id, league_id, team_id, week_number, new_tier, movement_type, automated, effective_date, created_at) VALUES 
(1, 1, 1, 1, 1, 'initial', true, '2025-01-01', NOW()),
(2, 1, 2, 1, 1, 'initial', true, '2025-01-01', NOW()),
(3, 1, 3, 1, 1, 'initial', true, '2025-01-01', NOW()),
(4, 1, 4, 1, 2, 'initial', true, '2025-01-01', NOW()),
(5, 1, 5, 1, 2, 'initial', true, '2025-01-01', NOW()),
(6, 1, 6, 1, 2, 'initial', true, '2025-01-01', NOW())
ON CONFLICT (id) DO NOTHING;