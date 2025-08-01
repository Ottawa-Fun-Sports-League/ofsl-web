/*
  # Fix Google Sign-up Flow

  1. Changes
    - Update the handle_new_user() function to properly handle Google sign-ins
    - Make the function call check_and_fix_user_profile_v3 for consistent user creation
    - Improve error handling and logging for better debugging
    - Ensure proper extraction of user metadata from different auth providers

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
  result BOOLEAN;
BEGIN
  -- Get the authentication provider
  provider := COALESCE(NEW.app_metadata->>'provider', 'email');
  
  -- Log the provider and metadata for debugging
  RAISE NOTICE 'Auth provider: %, User ID: %, Email: %', 
    provider, NEW.id, NEW.email;
  
  -- Extract user information from metadata based on provider
  IF provider = 'google' THEN
    -- Google-specific metadata extraction
    user_name := COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->'name',
      NEW.email,
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
  
  -- Use the enhanced v3 function to create or update the user profile
  SELECT check_and_fix_user_profile_v3(
    NEW.id::text,
    user_email,
    user_name,
    user_phone
  ) INTO result;
  
  IF result THEN
    RAISE NOTICE 'Successfully created or updated user profile for %', user_email;
  ELSE
    RAISE NOTICE 'Failed to create or update user profile for %', user_email;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log errors but don't fail the transaction
    RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
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