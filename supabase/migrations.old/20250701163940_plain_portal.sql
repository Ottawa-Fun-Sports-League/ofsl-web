/*
  # Backfill auth users to public users table

  1. Purpose
    - Create a function to add missing users from auth.users to public.users
    - Handle duplicate phone numbers by generating unique values
    - Ensure proper type casting between UUID and text types

  2. Implementation
    - Loop through auth users without corresponding public users
    - Generate unique phone numbers for duplicates
    - Insert records with proper type handling
*/

-- Create a function to backfill existing auth users to public.users table
CREATE OR REPLACE FUNCTION backfill_existing_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auth_user RECORD;
  now_timestamp TIMESTAMP WITH TIME ZONE := now();
  counter INTEGER := 0;
  unique_phone TEXT;
  attempt INTEGER;
BEGIN
  -- Loop through all auth users that don't have a corresponding public user
  FOR auth_user IN 
    SELECT au.* 
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id::text = pu.id
    WHERE pu.id IS NULL
  LOOP
    -- Get phone from metadata or use empty string
    unique_phone := COALESCE(auth_user.raw_user_meta_data->>'phone', '');
    attempt := 0;
    
    -- Handle potential duplicate phone numbers
    WHILE attempt < 10 AND unique_phone != '' AND EXISTS (
      SELECT 1 FROM public.users WHERE phone = unique_phone
    ) LOOP
      -- Append a suffix to make the phone number unique
      unique_phone := unique_phone || '-' || attempt;
      attempt := attempt + 1;
    END LOOP;
    
    -- If we still have a duplicate after 10 attempts, use empty string
    IF attempt >= 10 AND EXISTS (SELECT 1 FROM public.users WHERE phone = unique_phone) THEN
      unique_phone := '';
    END IF;
    
    BEGIN
      -- Insert a new record into public.users
      INSERT INTO public.users (
        id,
        auth_id,
        name,
        email,
        phone,
        date_created,
        date_modified,
        is_admin
      ) VALUES (
        auth_user.id::text,
        auth_user.id,
        COALESCE(auth_user.raw_user_meta_data->>'full_name', auth_user.raw_user_meta_data->>'name', ''),
        auth_user.email,
        unique_phone,
        now_timestamp,
        now_timestamp,
        false
      );
      
      counter := counter + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Log the error and continue with the next user
      RAISE NOTICE 'Skipping user % due to unique constraint violation', auth_user.id;
    END;
  END LOOP;
  
  -- Log the number of users backfilled
  RAISE NOTICE 'Backfilled % users from auth.users to public.users', counter;
END;
$$;

-- Execute the backfill function immediately
SELECT backfill_existing_users();

-- Drop the function after use (keeps the schema clean)
DROP FUNCTION backfill_existing_users();