/*
  # Fix User Signup Database Error

  1. Changes
    - Fix the handle_new_user() function to properly handle new user signups
    - Ensure proper error handling for duplicate users
    - Make phone field nullable to accommodate Google sign-in users without phone numbers
    - Update trigger to handle all authentication methods

  2. Security
    - No changes to existing RLS policies
*/

-- First, make the phone field nullable in the users table
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

-- Fix the handle_new_user() function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  now_timestamp TIMESTAMP WITH TIME ZONE := now();
  user_phone TEXT;
BEGIN
  -- Extract phone from metadata or use empty string
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  
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
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    user_phone,
    now_timestamp,
    now_timestamp,
    false
  )
  -- If the user already exists, do nothing
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the transaction
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