-- Fix spares schema - simplified approach
-- This migration creates a working generic spares system

BEGIN;

-- Drop problematic migrations and start fresh
DROP TABLE IF EXISTS public.spares CASCADE;
DROP TABLE IF EXISTS public.volleyball_spares CASCADE;

-- Create the generic spares table with correct schema
CREATE TABLE public.spares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    sport_id BIGINT NOT NULL REFERENCES public.sports(id) ON DELETE CASCADE,
    skill_level TEXT NOT NULL CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
    availability_notes TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Ensure a user can only have one active registration per sport
    UNIQUE(user_id, sport_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Add indexes for performance
CREATE INDEX idx_spares_user_id ON public.spares(user_id);
CREATE INDEX idx_spares_sport_id ON public.spares(sport_id);
CREATE INDEX idx_spares_is_active ON public.spares(is_active);
CREATE INDEX idx_spares_sport_active ON public.spares(sport_id, is_active);

-- Enable RLS
ALTER TABLE public.spares ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own spare registrations
CREATE POLICY "Users can view own spare registrations" ON public.spares
    FOR SELECT USING (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    );

-- Users can insert their own spare registrations
CREATE POLICY "Users can create own spare registrations" ON public.spares
    FOR INSERT WITH CHECK (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    );

-- Users can update their own spare registrations
CREATE POLICY "Users can update own spare registrations" ON public.spares
    FOR UPDATE USING (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    );

-- Users can delete their own spare registrations
CREATE POLICY "Users can delete own spare registrations" ON public.spares
    FOR DELETE USING (
        user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    );

-- Admins can view all spares
CREATE POLICY "Admins can view all spares" ON public.spares
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.auth_id = auth.uid() AND u.is_admin = true
        )
    );

-- Function to register as a spare for a sport
CREATE OR REPLACE FUNCTION register_spare(
    p_sport_id BIGINT,
    p_skill_level TEXT,
    p_availability_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_spare_id UUID;
    v_sport_exists BOOLEAN;
    v_user_id TEXT;
BEGIN
    -- Get the user ID from auth
    SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Validate sport exists and is active
    SELECT EXISTS(SELECT 1 FROM sports WHERE id = p_sport_id AND active = true) INTO v_sport_exists;
    
    IF NOT v_sport_exists THEN
        RAISE EXCEPTION 'Sport does not exist or is not active';
    END IF;

    -- Validate skill level
    IF p_skill_level NOT IN ('beginner', 'intermediate', 'advanced') THEN
        RAISE EXCEPTION 'Invalid skill level. Must be beginner, intermediate, or advanced';
    END IF;

    -- Check if user already has an active registration for this sport
    IF EXISTS(
        SELECT 1 FROM spares 
        WHERE user_id = v_user_id 
        AND sport_id = p_sport_id 
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'User already registered as spare for this sport';
    END IF;

    -- Insert new spare registration
    INSERT INTO spares (
        user_id, 
        sport_id, 
        skill_level, 
        availability_notes,
        is_active
    ) VALUES (
        v_user_id, 
        p_sport_id, 
        p_skill_level, 
        p_availability_notes,
        true
    )
    RETURNING id INTO v_spare_id;

    RETURN v_spare_id;
END;
$$;

-- Function to deactivate a spare registration
CREATE OR REPLACE FUNCTION deactivate_spare(
    p_registration_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id TEXT;
BEGIN
    -- Get the user ID from auth
    SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Update the registration to inactive
    UPDATE spares 
    SET is_active = false, 
        updated_at = now()
    WHERE id = p_registration_id 
    AND user_id = v_user_id 
    AND is_active = true;

    -- Return true if a row was updated
    RETURN FOUND;
END;
$$;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_spares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_spares_updated_at_trigger
    BEFORE UPDATE ON public.spares
    FOR EACH ROW
    EXECUTE FUNCTION update_spares_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spares TO authenticated;
GRANT EXECUTE ON FUNCTION register_spare TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_spare TO authenticated;

COMMIT;