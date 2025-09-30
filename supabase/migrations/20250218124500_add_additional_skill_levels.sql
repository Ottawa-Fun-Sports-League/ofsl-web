-- Add new skill level options and update ordering
INSERT INTO skills (name, description, order_index)
VALUES
  ('Novice', 'Brand new to the sport; learning rules and fundamentals', 1),
  ('Low Intermediate', 'Developing consistency beyond beginner play', 3),
  ('High Intermediate', 'Strong fundamentals with emerging advanced tactics', 5)
ON CONFLICT (name) DO UPDATE
SET
  description = EXCLUDED.description,
  order_index = EXCLUDED.order_index;

-- Ensure existing levels follow the new ordering
UPDATE skills SET order_index = 2 WHERE name = 'Beginner';
UPDATE skills SET order_index = 4 WHERE name = 'Intermediate';
UPDATE skills SET order_index = 6 WHERE name = 'Advanced';
UPDATE skills SET order_index = 7 WHERE name = 'Competitive';
UPDATE skills SET order_index = 8 WHERE name = 'Elite';
