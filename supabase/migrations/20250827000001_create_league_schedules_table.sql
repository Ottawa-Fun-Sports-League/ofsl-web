-- Create league_schedules table for storing volleyball league schedules
CREATE TABLE IF NOT EXISTS league_schedules (
    id SERIAL PRIMARY KEY,
    league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    schedule_data JSONB NOT NULL,
    format VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'unique_league_schedule'
          AND conrelid = 'public.league_schedules'::regclass
    ) THEN
        ALTER TABLE public.league_schedules
            ADD CONSTRAINT unique_league_schedule UNIQUE (league_id);
    END IF;
END $$;

-- Create index on league_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_league_schedules_league_id ON league_schedules(league_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE league_schedules ENABLE ROW LEVEL SECURITY;

-- Policy for admins to manage all schedules
DROP POLICY IF EXISTS "Admins can manage all schedules" ON league_schedules;
CREATE POLICY "Admins can manage all schedules" ON league_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Policy for authenticated users to view schedules
DROP POLICY IF EXISTS "Authenticated users can view schedules" ON league_schedules;
CREATE POLICY "Authenticated users can view schedules" ON league_schedules
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_league_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS league_schedules_updated_at ON league_schedules;
CREATE TRIGGER league_schedules_updated_at
    BEFORE UPDATE ON league_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_league_schedules_updated_at();
