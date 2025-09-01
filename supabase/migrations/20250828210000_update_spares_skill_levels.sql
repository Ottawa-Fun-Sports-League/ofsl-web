-- Update spares table skill_level constraint and register_spare function
-- to support all 5 skill levels: beginner, intermediate, advanced, competitive, elite

BEGIN;

-- Update the CHECK constraint on spares table to include all 5 skill levels
ALTER TABLE public.spares 
DROP CONSTRAINT IF EXISTS spares_skill_level_check;

ALTER TABLE public.spares 
ADD CONSTRAINT spares_skill_level_check 
CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'competitive', 'elite'));

-- Update the register_spare function to validate against all 5 skill levels
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

    -- Validate skill level - updated to include all 5 levels
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

COMMIT;