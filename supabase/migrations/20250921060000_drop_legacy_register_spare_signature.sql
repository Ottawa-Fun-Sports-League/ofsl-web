BEGIN;

DROP FUNCTION IF EXISTS public.register_spare(
    BIGINT,
    TEXT,
    BOOLEAN,
    BOOLEAN,
    BOOLEAN,
    BOOLEAN,
    BOOLEAN,
    BOOLEAN,
    BOOLEAN,
    BOOLEAN
);

CREATE OR REPLACE FUNCTION public.register_spare(
    p_sport_id BIGINT,
    p_skill_level TEXT,
    p_share_phone BOOLEAN DEFAULT false,
    p_available_monday BOOLEAN DEFAULT false,
    p_available_tuesday BOOLEAN DEFAULT false,
    p_available_wednesday BOOLEAN DEFAULT false,
    p_available_thursday BOOLEAN DEFAULT false,
    p_available_friday BOOLEAN DEFAULT false,
    p_available_saturday BOOLEAN DEFAULT false,
    p_available_sunday BOOLEAN DEFAULT false,
    p_gender_identity TEXT DEFAULT NULL,
    p_gender_identity_other TEXT DEFAULT NULL,
    p_volleyball_positions TEXT[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_spare_id UUID;
    v_sport_name TEXT;
    v_user_id TEXT;
    v_allowed_skill_levels CONSTANT TEXT[] := ARRAY['beginner', 'intermediate', 'advanced', 'competitive', 'elite'];
    v_allowed_genders CONSTANT TEXT[] := ARRAY[
      'woman',
      'man',
      'non-binary',
      'genderqueer',
      'genderfluid',
      'two-spirit',
      'agender',
      'transgender',
      'prefer-not-to-say',
      'self-described'
    ];
    v_gender TEXT;
    v_gender_other TEXT;
    v_allowed_positions CONSTANT TEXT[] := ARRAY[
      'setter',
      'opposite',
      'outside-hitter',
      'middle-blocker',
      'libero',
      'defensive-specialist',
      'serving-specialist',
      'utility'
    ];
    v_positions TEXT[];
    v_position TEXT;
BEGIN
    SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    SELECT name INTO v_sport_name FROM sports WHERE id = p_sport_id AND active = true;
    IF v_sport_name IS NULL THEN
        RAISE EXCEPTION 'Sport does not exist or is not active';
    END IF;

    IF p_skill_level NOT IN (SELECT UNNEST(v_allowed_skill_levels)) THEN
        RAISE EXCEPTION 'Invalid skill level. Must be: %', array_to_string(v_allowed_skill_levels, ', ');
    END IF;

    IF EXISTS(
        SELECT 1 FROM spares 
        WHERE user_id = v_user_id 
        AND sport_id = p_sport_id 
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'User already registered as spare for this sport';
    END IF;

    v_gender := NULL;
    v_gender_other := NULL;
    IF p_gender_identity IS NOT NULL THEN
        v_gender := regexp_replace(lower(trim(p_gender_identity)), '\\s+', '-', 'g');
        IF v_gender = '' THEN
          v_gender := NULL;
        ELSIF v_gender NOT IN (SELECT UNNEST(v_allowed_genders)) THEN
          RAISE EXCEPTION 'Invalid gender identity option: %', p_gender_identity;
        END IF;
    END IF;

    IF v_gender = 'self-described' THEN
        v_gender_other := NULLIF(trim(p_gender_identity_other), '');
        IF v_gender_other IS NULL THEN
          RAISE EXCEPTION 'Please describe your gender identity when selecting self-described option';
        END IF;
        v_gender_other := left(v_gender_other, 160);
    ELSE
        v_gender_other := NULL;
    END IF;

    IF p_volleyball_positions IS NOT NULL THEN
        IF lower(v_sport_name) <> 'volleyball' THEN
            RAISE EXCEPTION 'Volleyball positions are only applicable for the volleyball spares list';
        END IF;

        v_positions := ARRAY(
          SELECT DISTINCT value FROM (
            SELECT NULLIF(regexp_replace(lower(trim(pos)), '\\s+', '-', 'g'), '') AS value
            FROM unnest(p_volleyball_positions) AS pos
          ) AS normalized
          WHERE value IS NOT NULL
        );

        IF v_positions IS NULL OR array_length(v_positions, 1) = 0 THEN
          v_positions := NULL;
        ELSE
          FOREACH v_position IN ARRAY v_positions LOOP
            IF v_position NOT IN (SELECT UNNEST(v_allowed_positions)) THEN
              RAISE EXCEPTION 'Invalid volleyball position option: %', v_position;
            END IF;
          END LOOP;
        END IF;
    ELSE
        v_positions := NULL;
    END IF;

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
        gender_identity,
        gender_identity_other,
        volleyball_positions,
        is_active
    ) VALUES (
        v_user_id,
        p_sport_id,
        p_skill_level,
        COALESCE(p_share_phone, false),
        COALESCE(p_available_monday, false),
        COALESCE(p_available_tuesday, false),
        COALESCE(p_available_wednesday, false),
        COALESCE(p_available_thursday, false),
        COALESCE(p_available_friday, false),
        COALESCE(p_available_saturday, false),
        COALESCE(p_available_sunday, false),
        v_gender,
        v_gender_other,
        v_positions,
        true
    )
    RETURNING id INTO v_spare_id;

    RETURN v_spare_id;
END;
$$;

COMMIT;
