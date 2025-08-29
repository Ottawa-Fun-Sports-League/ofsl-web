-- Update spares table to use structured availability days instead of free-form text
-- This migration replaces availability_notes with individual day columns

BEGIN;

-- Add columns for each day of the week
ALTER TABLE public.spares 
ADD COLUMN available_monday BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN available_tuesday BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN available_wednesday BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN available_thursday BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN available_friday BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN available_saturday BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN available_sunday BOOLEAN DEFAULT false NOT NULL;

-- Drop the old availability_notes column
ALTER TABLE public.spares DROP COLUMN IF EXISTS availability_notes;

-- Update the register_spare function to accept availability days
CREATE OR REPLACE FUNCTION register_spare(
    p_sport_id BIGINT,
    p_skill_level TEXT,
    p_share_phone BOOLEAN DEFAULT false,
    p_available_monday BOOLEAN DEFAULT false,
    p_available_tuesday BOOLEAN DEFAULT false,
    p_available_wednesday BOOLEAN DEFAULT false,
    p_available_thursday BOOLEAN DEFAULT false,
    p_available_friday BOOLEAN DEFAULT false,
    p_available_saturday BOOLEAN DEFAULT false,
    p_available_sunday BOOLEAN DEFAULT false
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

    -- Validate skill level (allow all 5 levels)
    IF p_skill_level NOT IN ('beginner', 'intermediate', 'advanced', 'competitive', 'elite') THEN
        RAISE EXCEPTION 'Invalid skill level. Must be beginner, intermediate, advanced, competitive, or elite';
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

    -- Insert new spare registration with availability days
    INSERT INTO spares (
        user_id, 
        sport_id, 
        skill_level, 
        share_phone,
        available_monday,
        available_tuesday,
        available_wednesday,
        available_thursday,
        available_friday,
        available_saturday,
        available_sunday,
        is_active
    ) VALUES (
        v_user_id, 
        p_sport_id, 
        p_skill_level, 
        p_share_phone,
        p_available_monday,
        p_available_tuesday,
        p_available_wednesday,
        p_available_thursday,
        p_available_friday,
        p_available_saturday,
        p_available_sunday,
        true
    )
    RETURNING id INTO v_spare_id;

    RETURN v_spare_id;
END;
$$;

-- Add comments for clarity
COMMENT ON COLUMN public.spares.available_monday IS 'User is available to play on Mondays';
COMMENT ON COLUMN public.spares.available_tuesday IS 'User is available to play on Tuesdays';
COMMENT ON COLUMN public.spares.available_wednesday IS 'User is available to play on Wednesdays';
COMMENT ON COLUMN public.spares.available_thursday IS 'User is available to play on Thursdays';
COMMENT ON COLUMN public.spares.available_friday IS 'User is available to play on Fridays';
COMMENT ON COLUMN public.spares.available_saturday IS 'User is available to play on Saturdays';
COMMENT ON COLUMN public.spares.available_sunday IS 'User is available to play on Sundays';

COMMIT;