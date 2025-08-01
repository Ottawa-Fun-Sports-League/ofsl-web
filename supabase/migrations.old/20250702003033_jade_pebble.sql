/*
  # Fix User Creation Trigger

  1. Changes
    - Update the handle_new_user() function to properly handle new user signups
    - Ensure proper error handling for duplicate users
    - Make the function more robust with better error handling
    - Properly extract user metadata for profile creation

  2. Security
    - No changes to existing RLS policies
*/

-- Create or replace the function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  now_timestamp TIMESTAMP WITH TIME ZONE := now();
  user_name TEXT;
  user_phone TEXT;
  user_email TEXT;
BEGIN
  -- Extract user information from metadata
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );
  
  user_phone := COALESCE(
    NEW.raw_user_meta_data->>'phone',
    ''
  );
  
  user_email := COALESCE(NEW.email, '');
  
  -- Check if user already exists to avoid duplicates
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id::text) THEN
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
      NEW.id::text,
      NEW.id,
      user_name,
      user_email,
      user_phone,
      now_timestamp,
      now_timestamp,
      false
    );
    
    RAISE NOTICE 'Created new user profile for %', user_email;
  ELSE
    RAISE NOTICE 'User profile already exists for %', user_email;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle unique constraint violations gracefully
    RAISE NOTICE 'User profile already exists (unique violation) for %', NEW.email;
    RETURN NEW;
  WHEN others THEN
    -- Log other errors but don't fail the transaction
    RAISE NOTICE 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger to ensure it's using the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add a comment explaining the trigger
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Automatically creates a record in public.users when a new auth user signs up';