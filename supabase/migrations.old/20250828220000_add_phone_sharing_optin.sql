-- Add phone number sharing opt-in feature to spares system
-- This migration adds privacy controls for phone number sharing

BEGIN;

-- Add share_phone column to spares table (default false for privacy)
ALTER TABLE public.spares 
ADD COLUMN share_phone BOOLEAN DEFAULT false NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.spares.share_phone IS 'User consent to share phone number with team captains';

-- Update the register_spare function to accept phone sharing preference
CREATE OR REPLACE FUNCTION register_spare(
    p_sport_id BIGINT,
    p_skill_level TEXT,
    p_availability_notes TEXT DEFAULT NULL,
    p_share_phone BOOLEAN DEFAULT false
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

    -- Insert new spare registration with phone sharing preference
    INSERT INTO spares (
        user_id, 
        sport_id, 
        skill_level, 
        availability_notes,
        share_phone,
        is_active
    ) VALUES (
        v_user_id, 
        p_sport_id, 
        p_skill_level, 
        p_availability_notes,
        p_share_phone,
        true
    )
    RETURNING id INTO v_spare_id;

    RETURN v_spare_id;
END;
$$;

-- Add index for filtering by phone sharing preference
CREATE INDEX idx_spares_share_phone ON public.spares(share_phone, is_active);

COMMIT;