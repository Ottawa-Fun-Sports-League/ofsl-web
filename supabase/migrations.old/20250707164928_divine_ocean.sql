/*
  # Fix Google Sign-in User Creation

  1. Changes
    - Update the handle_new_user() function to properly handle Google sign-ins
    - Add better extraction of user metadata from Google auth provider
    - Improve error handling and logging for debugging
    - Fix issue with user creation for Google sign-in users

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
  provider TEXT;
BEGIN
  -- Get the authentication provider
  provider := COALESCE(NEW.app_metadata->>'provider', 'email');
  
  -- Log the provider and metadata for debugging
  RAISE NOTICE 'Auth provider: %, User ID: %, Email: %', 
    provider, NEW.id, NEW.email;
  RAISE NOTICE 'Raw user metadata: %', NEW.raw_user_meta_data;
  
  -- Extract user information from metadata based on provider
  IF provider = 'google' THEN
    -- Google-specific metadata extraction
    user_name := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->'name',
      NEW.raw_user_meta_data->>'email',
      ''
    );
    
    -- Google doesn't typically provide phone
    user_phone := '';
  ELSE
    -- Email sign-up metadata extraction
    user_name := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      ''
    );
    
    user_phone := COALESCE(
      NEW.raw_user_meta_data->>'phone',
      ''
    );
  END IF;
  
  -- Email should be consistent across providers
  user_email := COALESCE(NEW.email, '');
  
  -- Check if user already exists by auth_id
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE auth_id = NEW.id) THEN
    -- Also check by email as a fallback
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE email = user_email AND email != '') THEN
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
      
      RAISE NOTICE 'Created new user profile for % with provider %', user_email, provider;
    ELSE
      -- Update existing user with auth_id if found by email
      UPDATE public.users
      SET auth_id = NEW.id,
          date_modified = now_timestamp
      WHERE email = user_email AND email != '' AND auth_id IS NULL;
      
      RAISE NOTICE 'Updated existing user profile with auth_id for %', user_email;
    END IF;
  ELSE
    RAISE NOTICE 'User profile already exists for % with auth_id %', user_email, NEW.id;
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