-- Ensure the skills sequence and table exist (older environments may lack them)
CREATE SEQUENCE IF NOT EXISTS skills_id_seq START 1 INCREMENT 1;

CREATE TABLE IF NOT EXISTS skills (
  id BIGINT NOT NULL DEFAULT nextval('skills_id_seq'::regclass),
  name TEXT NOT NULL,
  description TEXT,
  order_index SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT skills_pkey PRIMARY KEY (id),
  CONSTRAINT skills_name_key UNIQUE (name)
);

-- Add new skill level options (idempotent so production data can be updated safely)
INSERT INTO skills (name, description, order_index)
VALUES
  ('Novice', 'Brand new to the sport; learning rules and fundamentals', 1),
  ('Low Intermediate', 'Developing consistency beyond beginner play', 3),
  ('High Intermediate', 'Strong fundamentals with emerging advanced tactics', 5)
ON CONFLICT (name) DO UPDATE
SET
  description = EXCLUDED.description,
  order_index = EXCLUDED.order_index;

-- Ensure legacy levels exist and follow the new ordering while preserving descriptions
INSERT INTO skills (name, order_index)
VALUES
  ('Beginner', 2),
  ('Intermediate', 4),
  ('Advanced', 6),
  ('Competitive', 7),
  ('Elite', 8)
ON CONFLICT (name) DO UPDATE
SET order_index = EXCLUDED.order_index;
