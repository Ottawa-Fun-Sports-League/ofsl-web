/*
  # Create users table

  1. New Tables
    - `users`
      - `id` (text, primary key) - unique user identifier
      - `auth_id` (uuid) - references auth.users
      - `email` (text) - user email
      - `full_name` (text) - user's full name
      - `preferred_name` (text) - user's preferred name
      - `phone` (text) - user's phone number
      - `emergency_name` (text) - emergency contact name
      - `emergency_phone` (text) - emergency contact phone
      - `skills` (jsonb) - user's skill levels for different sports
      - `team_ids` (bigint[]) - array of team IDs user belongs to
      - `is_admin` (boolean) - whether user is an admin
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `users` table
    - Add policies for user management
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  auth_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  preferred_name text,
  phone text,
  emergency_name text,
  emergency_phone text,
  skills jsonb DEFAULT '{}',
  team_ids bigint[] DEFAULT '{}',
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_team_ids ON users USING GIN(team_ids);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Users can view their own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

CREATE POLICY "Admins can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() AND users.is_admin = true
    )
  );

-- Create function to handle user creation from auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, full_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();