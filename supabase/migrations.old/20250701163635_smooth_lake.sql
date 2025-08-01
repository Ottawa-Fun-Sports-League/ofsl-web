/*
  # Create Auth User Trigger

  1. New Functions
    - `handle_new_user()` - Creates a record in public.users when a new auth.users record is created
    - Automatically populates user data from auth metadata

  2. Triggers
    - Adds trigger on auth.users table to call handle_new_user() after insert
    - Ensures every authenticated user has a corresponding public.users record

  3. Security
    - Function runs with security definer to ensure it has necessary permissions
    - No changes to existing RLS policies
*/

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  now_timestamp TIMESTAMP WITH TIME ZONE := now();
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
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    now_timestamp,
    now_timestamp,
    false
  )
  -- If the user already exists, do nothing
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add a comment explaining the trigger
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Automatically creates a record in public.users when a new auth user signs up';