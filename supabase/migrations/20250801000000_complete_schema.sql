-- OFSL Database Complete Schema Migration
-- Generated from project: aijuhalowwjbccyjrlgf
-- This script recreates the entire database schema from scratch

-- =============================================
-- EXTENSIONS
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- CUSTOM TYPES AND ENUMS
-- =============================================

-- Create custom enum types
CREATE TYPE gym_location_enum AS ENUM ('Central', 'East', 'West', 'South', 'Gatineau');
CREATE TYPE payment_method_enum AS ENUM ('stripe', 'cash', 'e_transfer', 'waived');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'partial', 'paid', 'overdue');
CREATE TYPE stripe_order_status AS ENUM ('pending', 'completed', 'canceled');
CREATE TYPE stripe_subscription_status AS ENUM ('not_started', 'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused');

-- =============================================
-- SEQUENCES
-- =============================================

-- Create sequences for bigint primary keys
CREATE SEQUENCE attendance_id_seq START 1 INCREMENT 1;
CREATE SEQUENCE balances_id_seq START 1 INCREMENT 1;
CREATE SEQUENCE gyms_id_seq START 1 INCREMENT 1;
CREATE SEQUENCE league_payments_id_seq START 1 INCREMENT 1;
CREATE SEQUENCE leagues_id_seq START 1 INCREMENT 1;
CREATE SEQUENCE registrations_id_seq START 1 INCREMENT 1;
CREATE SEQUENCE seasons_id_seq START 1 INCREMENT 1;
CREATE SEQUENCE skills_id_seq START 1 INCREMENT 1;
CREATE SEQUENCE stripe_customers_id_seq START 1 INCREMENT 1;
CREATE SEQUENCE stripe_orders_id_seq START 1 INCREMENT 1;
CREATE SEQUENCE stripe_subscriptions_id_seq START 1 INCREMENT 1;
CREATE SEQUENCE team_invites_id_seq START 1 INCREMENT 1;
CREATE SEQUENCE teams_id_seq START 1 INCREMENT 1;

-- Create sequences for integer primary keys
CREATE SEQUENCE waiver_acceptances_id_seq START 1 INCREMENT 1;
CREATE SEQUENCE waivers_id_seq START 1 INCREMENT 1;

-- =============================================
-- TABLES (in dependency order)
-- =============================================

-- Sports table (referenced by leagues, seasons, gyms)
CREATE TABLE sports (
    id BIGINT NOT NULL DEFAULT nextval('sports_id_seq'::regclass),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    CONSTRAINT sports_pkey PRIMARY KEY (id),
    CONSTRAINT sports_name_key UNIQUE (name)
);

-- Skills table (referenced by leagues, teams, users)
CREATE TABLE skills (
    id BIGINT NOT NULL DEFAULT nextval('skills_id_seq'::regclass),
    name TEXT NOT NULL,
    description TEXT,
    order_index SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT skills_pkey PRIMARY KEY (id),
    CONSTRAINT skills_name_key UNIQUE (name)
);

-- Gyms table (referenced by leagues, seasons)
CREATE TABLE gyms (
    id BIGINT NOT NULL DEFAULT nextval('gyms_id_seq'::regclass),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    gym TEXT,
    address TEXT,
    instructions TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    available_days SMALLINT[] DEFAULT '{}'::smallint[],
    available_sports BIGINT[] DEFAULT '{}'::bigint[],
    locations gym_location_enum[]
);

-- Waivers table (referenced by users, waiver_acceptances)
CREATE TABLE waivers (
    id INTEGER NOT NULL DEFAULT nextval('waivers_id_seq'::regclass),
    title CHARACTER VARYING(255) NOT NULL,
    content TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    CONSTRAINT waivers_pkey PRIMARY KEY (id)
);

-- Users table (referenced by many other tables)
CREATE TABLE users (
    id TEXT NOT NULL,
    date_created TEXT NOT NULL,
    date_modified TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    email TEXT,
    password TEXT,
    alt_phone TEXT[],
    auth_id UUID,
    profile_picture_url TEXT,
    preferred_position TEXT,
    is_admin BOOLEAN DEFAULT false,
    team_ids BIGINT[] DEFAULT '{}'::bigint[],
    user_sports_skills JSONB DEFAULT '[]'::jsonb,
    email_verified BOOLEAN DEFAULT false,
    profile_completed BOOLEAN DEFAULT false,
    waiver_accepted BOOLEAN DEFAULT false,
    waiver_accepted_at TIMESTAMP WITH TIME ZONE,
    waiver_id INTEGER,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_id_key UNIQUE (id),
    CONSTRAINT users_phone_key UNIQUE (phone),
    CONSTRAINT users_preferred_position_check CHECK (((preferred_position IS NULL) OR (preferred_position = ANY (ARRAY['Guard'::text, 'Forward'::text, 'Center'::text])))),
    CONSTRAINT users_waiver_id_fkey FOREIGN KEY (waiver_id) REFERENCES waivers(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

-- Leagues table (referenced by teams, league_payments, stripe_orders, stripe_products)
CREATE TABLE leagues (
    id BIGINT NOT NULL DEFAULT nextval('leagues_id_seq'::regclass),
    name TEXT NOT NULL,
    description TEXT,
    sport_id BIGINT,
    skill_id BIGINT,
    day_of_week SMALLINT,
    start_date DATE,
    end_date DATE,
    cost REAL,
    max_teams INTEGER DEFAULT 20,
    gym_ids BIGINT[] DEFAULT '{}'::bigint[],
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    year TEXT,
    hide_day BOOLEAN DEFAULT false,
    location TEXT,
    skill_ids BIGINT[] DEFAULT '{}'::bigint[],
    league_type TEXT,
    gender TEXT,
    payment_due_date DATE,
    CONSTRAINT leagues_pkey PRIMARY KEY (id),
    CONSTRAINT leagues_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6))),
    CONSTRAINT leagues_gender_check CHECK ((gender = ANY (ARRAY['Mixed'::text, 'Female'::text, 'Male'::text]))),
    CONSTRAINT leagues_league_type_check CHECK ((league_type = ANY (ARRAY['regular_season'::text, 'tournament'::text, 'skills_drills'::text]))),
    CONSTRAINT leagues_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT leagues_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES sports(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

-- Seasons table (referenced by attendance, registrations)
CREATE TABLE seasons (
    id BIGINT NOT NULL DEFAULT nextval('seasons_id_seq'::regclass),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    season TEXT,
    start_date DATE,
    end_date DATE,
    cost_gym_rental REAL,
    cost_full_time REAL,
    cost_drop_in REAL,
    gym_id BIGINT,
    blackout_dates DATE[],
    active BOOLEAN NOT NULL DEFAULT false,
    day_of_the_week SMALLINT,
    whatsapp TEXT,
    new BOOLEAN DEFAULT false,
    notes TEXT,
    max_players INTEGER DEFAULT 18,
    sport_id BIGINT,
    CONSTRAINT seasons_pkey PRIMARY KEY (id),
    CONSTRAINT seasons_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES gyms(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT seasons_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES sports(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

-- Teams table (referenced by team_invites, team_registration_notifications, league_payments)
CREATE TABLE teams (
    id BIGINT NOT NULL DEFAULT nextval('teams_id_seq'::regclass),
    name TEXT NOT NULL,
    league_id BIGINT,
    captain_id TEXT,
    roster TEXT[] DEFAULT '{}'::text[],
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    skill_level_id BIGINT,
    display_order INTEGER DEFAULT 0,
    co_captains TEXT[] DEFAULT '{}'::text[],
    CONSTRAINT teams_pkey PRIMARY KEY (id),
    CONSTRAINT teams_captain_id_fkey FOREIGN KEY (captain_id) REFERENCES users(id) ON UPDATE NO ACTION ON DELETE SET NULL,
    CONSTRAINT teams_league_id_fkey FOREIGN KEY (league_id) REFERENCES leagues(id) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT teams_skill_level_id_fkey FOREIGN KEY (skill_level_id) REFERENCES skills(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

-- Stripe tables
CREATE TABLE stripe_customers (
    id BIGINT NOT NULL DEFAULT nextval('stripe_customers_id_seq'::regclass),
    user_id UUID NOT NULL,
    customer_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT stripe_customers_pkey PRIMARY KEY (id),
    CONSTRAINT stripe_customers_customer_id_key UNIQUE (customer_id),
    CONSTRAINT stripe_customers_user_id_key UNIQUE (user_id)
);

CREATE TABLE stripe_orders (
    id BIGINT NOT NULL DEFAULT nextval('stripe_orders_id_seq'::regclass),
    checkout_session_id TEXT NOT NULL,
    payment_intent_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    amount_subtotal BIGINT NOT NULL,
    amount_total BIGINT NOT NULL,
    currency TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    status stripe_order_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    league_id BIGINT,
    CONSTRAINT stripe_orders_pkey PRIMARY KEY (id),
    CONSTRAINT stripe_orders_league_id_fkey FOREIGN KEY (league_id) REFERENCES leagues(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE stripe_products (
    id TEXT NOT NULL,
    price_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    mode TEXT NOT NULL,
    price NUMERIC(10,2),
    currency TEXT DEFAULT 'cad',
    interval TEXT,
    league_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT stripe_products_pkey PRIMARY KEY (id),
    CONSTRAINT stripe_products_league_id_fkey FOREIGN KEY (league_id) REFERENCES leagues(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE stripe_subscriptions (
    id BIGINT NOT NULL DEFAULT nextval('stripe_subscriptions_id_seq'::regclass),
    customer_id TEXT NOT NULL,
    subscription_id TEXT,
    price_id TEXT,
    current_period_start BIGINT,
    current_period_end BIGINT,
    cancel_at_period_end BOOLEAN DEFAULT false,
    payment_method_brand TEXT,
    payment_method_last4 TEXT,
    status stripe_subscription_status NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT stripe_subscriptions_pkey PRIMARY KEY (id),
    CONSTRAINT stripe_subscriptions_customer_id_key UNIQUE (customer_id)
);

-- League payments table (references users, teams, leagues, stripe_orders)
CREATE TABLE league_payments (
    id BIGINT NOT NULL DEFAULT nextval('league_payments_id_seq'::regclass),
    user_id TEXT NOT NULL,
    team_id BIGINT,
    league_id BIGINT NOT NULL,
    amount_due NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    due_date DATE,
    status payment_status_enum NOT NULL DEFAULT 'pending',
    payment_method payment_method_enum,
    stripe_order_id BIGINT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT league_payments_pkey PRIMARY KEY (id),
    CONSTRAINT league_payments_league_id_fkey FOREIGN KEY (league_id) REFERENCES leagues(id) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT league_payments_stripe_order_id_fkey FOREIGN KEY (stripe_order_id) REFERENCES stripe_orders(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT league_payments_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT league_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

-- Team invites table (references teams, users)
CREATE TABLE team_invites (
    id BIGINT NOT NULL DEFAULT nextval('team_invites_id_seq'::regclass),
    team_id BIGINT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    invited_by TEXT NOT NULL,
    team_name TEXT NOT NULL,
    league_name TEXT NOT NULL,
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + '30 days'::interval),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT team_invites_pkey PRIMARY KEY (id),
    CONSTRAINT team_invites_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text]))),
    CONSTRAINT team_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES users(id) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT team_invites_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

-- Team registration notifications table (references teams)
CREATE TABLE team_registration_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    team_id INTEGER NOT NULL,
    team_name TEXT NOT NULL,
    captain_name TEXT NOT NULL,
    captain_email TEXT NOT NULL,
    captain_phone TEXT,
    league_name TEXT NOT NULL,
    registered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    roster_count INTEGER NOT NULL,
    sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT team_registration_notifications_pkey PRIMARY KEY (id),
    CONSTRAINT team_registration_notifications_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

-- Attendance table (references users, seasons)
CREATE TABLE attendance (
    id BIGINT NOT NULL DEFAULT nextval('attendance_id_seq'::regclass),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    player TEXT,
    season BIGINT,
    is_waitlisted BOOLEAN DEFAULT false,
    CONSTRAINT attendance_pkey PRIMARY KEY (id),
    CONSTRAINT attendance_player_fkey FOREIGN KEY (player) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT attendance_season_fkey FOREIGN KEY (season) REFERENCES seasons(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

-- Balances table (references users)
CREATE TABLE balances (
    id BIGINT NOT NULL DEFAULT nextval('balances_id_seq'::regclass),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    player TEXT,
    paid REAL,
    bonus REAL,
    CONSTRAINT balances_pkey PRIMARY KEY (id),
    CONSTRAINT balances_player_fkey FOREIGN KEY (player) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Registrations table (references users, seasons)
CREATE TABLE registrations (
    id BIGINT NOT NULL DEFAULT nextval('registrations_id_seq'::regclass),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    player TEXT,
    season BIGINT,
    status TEXT,
    CONSTRAINT registrations_pkey PRIMARY KEY (id),
    CONSTRAINT registrations_player_fkey FOREIGN KEY (player) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT registrations_season_fkey FOREIGN KEY (season) REFERENCES seasons(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Waiver acceptances table (references users, waivers)
CREATE TABLE waiver_acceptances (
    id INTEGER NOT NULL DEFAULT nextval('waiver_acceptances_id_seq'::regclass),
    user_id TEXT,
    waiver_id INTEGER,
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    CONSTRAINT waiver_acceptances_pkey PRIMARY KEY (id),
    CONSTRAINT waiver_acceptances_user_id_waiver_id_key UNIQUE (user_id, waiver_id),
    CONSTRAINT waiver_acceptances_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT waiver_acceptances_waiver_id_fkey FOREIGN KEY (waiver_id) REFERENCES waivers(id) ON UPDATE NO ACTION ON DELETE RESTRICT
);

-- =============================================
-- INDEXES
-- =============================================

-- Attendance indexes
CREATE INDEX idx_attendance_season_waitlist ON attendance USING btree (season, is_waitlisted);

-- Gyms indexes
CREATE INDEX idx_gyms_available_days ON gyms USING gin (available_days);
CREATE INDEX idx_gyms_available_sports ON gyms USING gin (available_sports);

-- League payments indexes
CREATE INDEX idx_league_payments_league_id ON league_payments USING btree (league_id);
CREATE INDEX idx_league_payments_status ON league_payments USING btree (status);
CREATE INDEX idx_league_payments_stripe_order_id ON league_payments USING btree (stripe_order_id);
CREATE INDEX idx_league_payments_team_id ON league_payments USING btree (team_id);
CREATE INDEX idx_league_payments_user_id ON league_payments USING btree (user_id);

-- Leagues indexes
CREATE INDEX idx_leagues_active ON leagues USING btree (active);
CREATE INDEX idx_leagues_day_of_week ON leagues USING btree (day_of_week);
CREATE INDEX idx_leagues_league_type ON leagues USING btree (league_type);
CREATE INDEX idx_leagues_skill_id ON leagues USING btree (skill_id);
CREATE INDEX idx_leagues_skill_ids ON leagues USING gin (skill_ids);
CREATE INDEX idx_leagues_sport_id ON leagues USING btree (sport_id);

-- Stripe orders indexes
CREATE INDEX idx_stripe_orders_league_id ON stripe_orders USING btree (league_id);

-- Team invites indexes
CREATE INDEX idx_team_invites_email ON team_invites USING btree (email);
CREATE INDEX idx_team_invites_status ON team_invites USING btree (status);
CREATE INDEX idx_team_invites_team_id ON team_invites USING btree (team_id);

-- Team registration notifications indexes
CREATE INDEX idx_team_notifications_unsent ON team_registration_notifications USING btree (sent, created_at) WHERE (sent = false);

-- Teams indexes
CREATE INDEX idx_teams_active ON teams USING btree (active);
CREATE INDEX idx_teams_captain_id ON teams USING btree (captain_id);
CREATE INDEX idx_teams_co_captains ON teams USING gin (co_captains);
CREATE INDEX idx_teams_display_order ON teams USING btree (display_order);
CREATE INDEX idx_teams_league_id ON teams USING btree (league_id);
CREATE INDEX idx_teams_skill_level_id ON teams USING btree (skill_level_id);

-- Users indexes
CREATE INDEX idx_users_team_ids ON users USING gin (team_ids);

-- Waiver acceptances indexes
CREATE INDEX idx_waiver_acceptances_user ON waiver_acceptances USING btree (user_id);
CREATE INDEX idx_waiver_acceptances_waiver ON waiver_acceptances USING btree (waiver_id);

-- Waivers indexes
CREATE INDEX idx_waivers_active ON waivers USING btree (is_active);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get current user ID
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id TEXT;
BEGIN
  SELECT id INTO user_id
  FROM users
  WHERE auth_id = auth.uid();
  
  RETURN user_id;
END;
$$;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE auth_id = auth.uid() 
    AND is_admin = true
  );
$$;

-- Function to calculate user outstanding balance
CREATE OR REPLACE FUNCTION calculate_user_outstanding_balance(p_user_id text)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(amount_due - amount_paid), 0.00)
  FROM league_payments
  WHERE user_id = p_user_id
  AND status IN ('pending', 'partial', 'overdue');
$$;

-- Function to get user sports skills
CREATE OR REPLACE FUNCTION get_user_sports_skills(p_user_id text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id TEXT;
  v_sports_skills JSONB;
BEGIN
  -- If no user_id provided, use the current user
  IF p_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM users WHERE auth_id = auth.uid();
  ELSE
    v_user_id := p_user_id;
  END IF;
  
  -- Get the user's sports and skills preferences
  SELECT user_sports_skills INTO v_sports_skills
  FROM users
  WHERE id = v_user_id;
  
  RETURN COALESCE(v_sports_skills, '[]'::jsonb);
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error getting user sports and skills: %', SQLERRM;
    RETURN '[]'::jsonb;
END;
$$;

-- Function to update user sports skills
CREATE OR REPLACE FUNCTION update_user_sports_skills(p_user_id text, p_sports_skills jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id TEXT;
  v_is_admin BOOLEAN;
BEGIN
  -- Get current user ID
  SELECT id INTO v_current_user_id FROM users WHERE auth_id = auth.uid();
  
  -- Check if current user is admin
  SELECT is_admin INTO v_is_admin FROM users WHERE auth_id = auth.uid();
  
  -- Verify permissions (user can only update their own preferences unless they're an admin)
  IF v_current_user_id != p_user_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Permission denied: You can only update your own sports preferences';
    RETURN FALSE;
  END IF;
  
  -- Validate input format (should be an array of objects with sport_id and skill_id)
  IF jsonb_typeof(p_sports_skills) != 'array' THEN
    RAISE EXCEPTION 'Invalid format: sports_skills must be an array';
    RETURN FALSE;
  END IF;
  
  -- Update the user record
  UPDATE users
  SET 
    user_sports_skills = p_sports_skills,
    date_modified = now()
  WHERE id = p_user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error updating user sports and skills: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- =============================================
-- TRIGGER FUNCTIONS
-- =============================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Function to update payment status
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the payment status based on amounts
  IF NEW.amount_paid >= NEW.amount_due THEN
    NEW.status = 'paid';
  ELSIF NEW.amount_paid > 0 THEN
    NEW.status = 'partial';
  ELSIF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN
    NEW.status = 'overdue';
  ELSE
    NEW.status = 'pending';
  END IF;
  
  -- Update the updated_at timestamp
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Function to sync league payment due dates
CREATE OR REPLACE FUNCTION sync_league_payment_due_dates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- When payment_due_date is updated in leagues table, update all related payment records
  IF OLD.payment_due_date IS DISTINCT FROM NEW.payment_due_date THEN
    UPDATE league_payments
    SET due_date = NEW.payment_due_date
    WHERE league_id = NEW.id
    AND status != 'paid'; -- Only update unpaid payments
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to create league payment for team
CREATE OR REPLACE FUNCTION create_league_payment_for_team()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- When a new team is created, create a league payment record for the captain
  IF TG_OP = 'INSERT' AND NEW.captain_id IS NOT NULL AND NEW.league_id IS NOT NULL THEN
    -- Get the league cost and payment due date
    INSERT INTO league_payments (
      user_id,
      team_id,
      league_id,
      amount_due,
      due_date,
      status
    )
    SELECT 
      NEW.captain_id,
      NEW.id,
      NEW.league_id,
      COALESCE(l.cost, 0.00),
      COALESCE(l.payment_due_date, CURRENT_DATE + INTERVAL '30 days'), -- Use league's payment_due_date or default to 30 days
      'pending'
    FROM leagues l
    WHERE l.id = NEW.league_id
    AND COALESCE(l.cost, 0.00) > 0; -- Only create if there's a cost
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to queue team registration notification
CREATE OR REPLACE FUNCTION queue_team_registration_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    captain_record RECORD;
    league_record RECORD;
BEGIN
    -- Only proceed for new teams (on INSERT)
    IF TG_OP != 'INSERT' THEN
        RETURN NEW;
    END IF;

    -- Get captain information
    SELECT name, email, phone INTO captain_record
    FROM users
    WHERE id = NEW.captain_id;

    -- Get league information
    SELECT name INTO league_record
    FROM leagues
    WHERE id = NEW.league_id;

    -- Insert notification record
    INSERT INTO team_registration_notifications (
        team_id,
        team_name,
        captain_name,
        captain_email,
        captain_phone,
        league_name,
        registered_at,
        roster_count
    ) VALUES (
        NEW.id,
        NEW.name,
        COALESCE(captain_record.name, 'Unknown'),
        COALESCE(captain_record.email, 'Unknown'),
        captain_record.phone,
        COALESCE(league_record.name, 'Unknown League'),
        NEW.created_at,
        COALESCE(array_length(NEW.roster, 1), 1)
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the team creation
        RAISE WARNING 'Failed to queue team registration notification: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Function to update team invites updated_at
CREATE OR REPLACE FUNCTION update_team_invites_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function to handle user signup and add to teams
CREATE OR REPLACE FUNCTION handle_user_signup_and_add_to_teams()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invite RECORD;
  current_roster text[];
BEGIN
  -- Only process for new user inserts
  IF TG_OP = 'INSERT' THEN
    -- Process each pending invite for this user's email
    FOR invite IN 
      SELECT ti.id as invite_id, ti.team_id, t.roster
      FROM team_invites ti
      JOIN teams t ON t.id = ti.team_id
      WHERE LOWER(ti.email) = LOWER(NEW.email)
        AND ti.status = 'pending'
        AND ti.expires_at > NOW()
        AND t.active = true
    LOOP
      -- Get current roster
      current_roster := COALESCE(invite.roster, ARRAY[]::text[]);
      
      -- Add user to team if not already in roster
      IF NOT (NEW.id = ANY(current_roster)) THEN
        -- Update team roster
        UPDATE teams 
        SET roster = array_append(current_roster, NEW.id)
        WHERE id = invite.team_id;
        
        -- Mark invite as accepted
        UPDATE team_invites
        SET status = 'accepted',
            accepted_at = NOW(),
            updated_at = NOW()
        WHERE id = invite.invite_id;
        
        RAISE NOTICE 'Added user % to team %', NEW.id, invite.team_id;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to schedule process team invites
CREATE OR REPLACE FUNCTION schedule_process_team_invites()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Instead of processing invites directly, we'll just log that a new user was created
  -- The actual processing will happen through the application or a scheduled job
  -- This avoids RLS permission issues
  
  -- We can still check if there are pending invites for this email
  IF EXISTS (
    SELECT 1 FROM team_invites 
    WHERE LOWER(email) = LOWER(NEW.email) 
    AND status = 'pending'
    AND expires_at > NOW()
  ) THEN
    -- Log that this user has pending invites (optional)
    RAISE NOTICE 'User % has pending team invites', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =============================================
-- TRIGGERS
-- =============================================

-- League payments triggers
CREATE TRIGGER update_league_payment_status 
    BEFORE INSERT OR UPDATE ON league_payments 
    FOR EACH ROW EXECUTE FUNCTION update_payment_status();

-- Leagues triggers
CREATE TRIGGER sync_payment_due_dates_on_league_update 
    AFTER UPDATE ON leagues 
    FOR EACH ROW EXECUTE FUNCTION sync_league_payment_due_dates();

-- Stripe products triggers
CREATE TRIGGER update_stripe_products_updated_at 
    BEFORE UPDATE ON stripe_products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Team invites triggers
CREATE TRIGGER trigger_team_invites_updated_at 
    BEFORE UPDATE ON team_invites 
    FOR EACH ROW EXECUTE FUNCTION update_team_invites_updated_at();

-- Teams triggers
CREATE TRIGGER create_league_payment_on_team_insert 
    AFTER INSERT ON teams 
    FOR EACH ROW EXECUTE FUNCTION create_league_payment_for_team();

CREATE TRIGGER on_team_registration 
    AFTER INSERT ON teams 
    FOR EACH ROW EXECUTE FUNCTION queue_team_registration_notification();

CREATE TRIGGER update_teams_updated_at 
    BEFORE UPDATE ON teams 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Users triggers
CREATE TRIGGER add_user_to_teams_on_signup 
    AFTER INSERT ON users 
    FOR EACH ROW EXECUTE FUNCTION handle_user_signup_and_add_to_teams();

CREATE TRIGGER notify_new_user_trigger 
    AFTER INSERT ON users 
    FOR EACH ROW EXECUTE FUNCTION schedule_process_team_invites();

-- Waivers triggers
CREATE TRIGGER update_waivers_updated_at 
    BEFORE UPDATE ON waivers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_registration_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiver_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE waivers ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Attendance policies
CREATE POLICY "Enable read access for authenticated users" ON attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view their own attendance" ON attendance FOR SELECT TO authenticated USING (auth.uid() IN (SELECT users.auth_id FROM users WHERE (users.id = attendance.player)));
CREATE POLICY "Users can insert attendance records" ON attendance FOR INSERT TO public WITH CHECK (((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))) OR (auth.uid() IN (SELECT users.auth_id FROM users WHERE (users.id = attendance.player)))));
CREATE POLICY "Users can delete their own attendance" ON attendance FOR DELETE TO authenticated USING (auth.uid() IN (SELECT users.auth_id FROM users WHERE (users.id = attendance.player)));
CREATE POLICY "Admins can delete attendance records" ON attendance FOR DELETE TO authenticated USING ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));

-- Balances policies
CREATE POLICY "Users can view their own balances" ON balances FOR SELECT TO authenticated USING (auth.uid() IN (SELECT users.auth_id FROM users WHERE (users.id = balances.player)));
CREATE POLICY "Admins can view all balances" ON balances FOR SELECT TO authenticated USING ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));
CREATE POLICY "Users can insert balance records" ON balances FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can insert balances" ON balances FOR INSERT TO authenticated WITH CHECK ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));
CREATE POLICY "Admins can delete balance entries" ON balances FOR DELETE TO authenticated USING ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));

-- Gyms policies
CREATE POLICY "Allow all users to view gyms" ON gyms FOR SELECT TO public USING (true);
CREATE POLICY "Enable read access for all authenticated users" ON gyms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admins full access to gyms" ON gyms FOR ALL TO public USING ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));

-- League payments policies
CREATE POLICY "Users can view their own league payments" ON league_payments FOR SELECT TO authenticated USING (user_id = get_current_user_id());
CREATE POLICY "Users can create their own league payments" ON league_payments FOR INSERT TO authenticated WITH CHECK (user_id = get_current_user_id());
CREATE POLICY "Admins can view all league payments" ON league_payments FOR SELECT TO authenticated USING ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));
CREATE POLICY "Admins can manage all league payments" ON league_payments FOR ALL TO authenticated USING ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true))))) WITH CHECK ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));

-- Leagues policies
CREATE POLICY "Enable read access for all users" ON leagues FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage leagues" ON leagues FOR ALL TO authenticated USING ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true))))) WITH CHECK ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));
CREATE POLICY "Admins can update payment_due_date" ON leagues FOR UPDATE TO public USING ((EXISTS (SELECT 1 FROM users WHERE ((users.id = (auth.uid())::text) AND (users.is_admin = true))))) WITH CHECK ((EXISTS (SELECT 1 FROM users WHERE ((users.id = (auth.uid())::text) AND (users.is_admin = true)))));

-- Registrations policies
CREATE POLICY "Enable read access for all authenticated users" ON registrations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert registrations" ON registrations FOR INSERT TO public WITH CHECK (((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))) OR (auth.uid() IN (SELECT users.auth_id FROM users WHERE (users.id = registrations.player)))));
CREATE POLICY "Users can update registrations" ON registrations FOR UPDATE TO public USING (((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))) OR (auth.uid() IN (SELECT users.auth_id FROM users WHERE (users.id = registrations.player)))));
CREATE POLICY "Users can delete registrations" ON registrations FOR DELETE TO public USING (((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))) OR (auth.uid() IN (SELECT users.auth_id FROM users WHERE (users.id = registrations.player)))));
CREATE POLICY "Admins can manage all registrations" ON registrations FOR ALL TO public USING ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));

-- Seasons policies
CREATE POLICY "Enable read access for all users" ON seasons FOR SELECT TO public USING (true);
CREATE POLICY "Users can view seasons related to their attendance" ON seasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert seasons" ON seasons FOR INSERT TO authenticated WITH CHECK ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));
CREATE POLICY "Admins can update seasons" ON seasons FOR UPDATE TO authenticated USING ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));
CREATE POLICY "Admins can update seasons new field" ON seasons FOR UPDATE TO authenticated USING ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true))))) WITH CHECK ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));
CREATE POLICY "Admins can delete seasons" ON seasons FOR DELETE TO authenticated USING ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));

-- Skills policies
CREATE POLICY "Enable read access for all users" ON skills FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage skills" ON skills FOR ALL TO authenticated USING ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true))))) WITH CHECK ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));

-- Sports policies
CREATE POLICY "Enable read access for all users" ON sports FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage sports" ON sports FOR ALL TO authenticated USING ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));

-- Stripe customers policies
CREATE POLICY "Users can view their own customer data" ON stripe_customers FOR SELECT TO authenticated USING (((user_id = auth.uid()) AND (deleted_at IS NULL)));

-- Stripe orders policies
CREATE POLICY "Users can view their own order data" ON stripe_orders FOR SELECT TO authenticated USING (((customer_id IN (SELECT stripe_customers.customer_id FROM stripe_customers WHERE ((stripe_customers.user_id = auth.uid()) AND (stripe_customers.deleted_at IS NULL)))) AND (deleted_at IS NULL)));

-- Stripe products policies
CREATE POLICY "Allow all users to read products" ON stripe_products FOR SELECT TO public USING (true);
CREATE POLICY "Allow admins to manage products" ON stripe_products FOR ALL TO authenticated USING ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true))))) WITH CHECK ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));

-- Stripe subscriptions policies
CREATE POLICY "Users can view their own subscription data" ON stripe_subscriptions FOR SELECT TO authenticated USING (((customer_id IN (SELECT stripe_customers.customer_id FROM stripe_customers WHERE ((stripe_customers.user_id = auth.uid()) AND (stripe_customers.deleted_at IS NULL)))) AND (deleted_at IS NULL)));

-- Team invites policies
CREATE POLICY "Users can view their own invites by email" ON team_invites FOR SELECT TO public USING (((lower(email) = lower((auth.jwt() ->> 'email'::text))) AND (status = 'pending'::text) AND (expires_at > now())));
CREATE POLICY "Authenticated users can view their invites" ON team_invites FOR SELECT TO public USING (((EXISTS (SELECT 1 FROM users u WHERE ((u.auth_id = auth.uid()) AND (lower(u.email) = lower(team_invites.email))))) AND (status = 'pending'::text) AND (expires_at > now())));
CREATE POLICY "Users can view invites for their teams" ON team_invites FOR SELECT TO public USING ((team_id IN (SELECT teams.id FROM teams WHERE ((teams.captain_id = (auth.uid())::text) OR ((auth.uid())::text = ANY (teams.roster))))));
CREATE POLICY "Team captains can manage invites" ON team_invites FOR ALL TO public USING ((team_id IN (SELECT teams.id FROM teams WHERE (teams.captain_id = (auth.uid())::text))));
CREATE POLICY "Users can update their own invites by email" ON team_invites FOR UPDATE TO public USING (((lower(email) = lower((auth.jwt() ->> 'email'::text))) AND (status = 'pending'::text) AND (expires_at > now()))) WITH CHECK ((lower(email) = lower((auth.jwt() ->> 'email'::text))));

-- Team registration notifications policies
CREATE POLICY "Service role can manage notifications" ON team_registration_notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Teams policies
CREATE POLICY "Enable read access for all users" ON teams FOR SELECT TO public USING (true);
CREATE POLICY "Team captains can manage their teams" ON teams FOR ALL TO authenticated USING (((captain_id = get_current_user_id()) OR (get_current_user_id() = ANY (roster)))) WITH CHECK (((captain_id = get_current_user_id()) OR ((get_current_user_id() = ANY (roster)) AND (captain_id = ANY (roster)))));
CREATE POLICY "Admins can manage all teams" ON teams FOR ALL TO authenticated USING ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true))))) WITH CHECK ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));

-- Users policies
CREATE POLICY "Allow authenticated users to view public profile information" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create own profile" ON users FOR INSERT TO authenticated WITH CHECK ((auth_id = auth.uid()));
CREATE POLICY "Admins can read all users" ON users FOR SELECT TO authenticated USING (((auth_id = auth.uid()) OR is_current_user_admin()));
CREATE POLICY "Admins can update all users" ON users FOR UPDATE TO authenticated USING (((auth_id = auth.uid()) OR is_current_user_admin())) WITH CHECK (((auth_id = auth.uid()) OR is_current_user_admin()));
CREATE POLICY "Admins can delete users" ON users FOR DELETE TO authenticated USING (is_current_user_admin());
CREATE POLICY "System functions can access users" ON users FOR ALL TO authenticated USING (((auth_id = auth.uid()) OR (current_setting('role'::text, true) = 'postgres'::text)));

-- Waiver acceptances policies
CREATE POLICY "Users can view own waiver acceptances" ON waiver_acceptances FOR SELECT TO public USING ((user_id IN (SELECT users.id FROM users WHERE (users.auth_id = auth.uid()))));
CREATE POLICY "Users can accept waivers" ON waiver_acceptances FOR INSERT TO public WITH CHECK ((user_id IN (SELECT users.id FROM users WHERE (users.auth_id = auth.uid()))));
CREATE POLICY "Admins can view all waiver acceptances" ON waiver_acceptances FOR SELECT TO public USING ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));

-- Waivers policies
CREATE POLICY "Active waivers are viewable by everyone" ON waivers FOR SELECT TO public USING ((is_active = true));
CREATE POLICY "Admins can manage waivers" ON waivers FOR ALL TO public USING ((EXISTS (SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.is_admin = true)))));

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON DATABASE postgres IS 'OFSL (Ottawa Fun Sports League) Database - Manages sports leagues, teams, players, and payments';

-- Table comments
COMMENT ON TABLE sports IS 'Available sports in the league system';
COMMENT ON TABLE skills IS 'Skill levels for sports (e.g., Beginner, Intermediate, Advanced)';
COMMENT ON TABLE gyms IS 'Gym locations and facilities information';
COMMENT ON TABLE leagues IS 'Sports leagues with scheduling and cost information';
COMMENT ON TABLE teams IS 'Teams registered in leagues with rosters';
COMMENT ON TABLE users IS 'User profiles and account information';
COMMENT ON TABLE league_payments IS 'Payment tracking for league registrations';
COMMENT ON TABLE team_invites IS 'Team invitations sent to potential players';
COMMENT ON TABLE attendance IS 'Player attendance tracking for seasons';
COMMENT ON TABLE registrations IS 'Player registrations for seasons';
COMMENT ON TABLE balances IS 'Player account balances and payment history';
COMMENT ON TABLE waivers IS 'Legal waivers that users must accept';
COMMENT ON TABLE waiver_acceptances IS 'Records of users accepting waivers';
COMMENT ON TABLE stripe_customers IS 'Stripe customer information linked to users';
COMMENT ON TABLE stripe_orders IS 'Stripe payment orders';
COMMENT ON TABLE stripe_products IS 'Stripe products for league payments';
COMMENT ON TABLE stripe_subscriptions IS 'Stripe subscription information';
COMMENT ON TABLE team_registration_notifications IS 'Queue for team registration email notifications';

-- =============================================
-- FINAL NOTES
-- =============================================

/*
This migration recreates the complete OFSL database schema including:

1. All custom types and enums
2. All tables with proper relationships and constraints
3. All indexes for performance optimization
4. All functions for business logic
5. All triggers for automated processes
6. Complete Row Level Security (RLS) setup
7. All RLS policies for data access control

To use this migration:
1. Create a new database
2. Run this entire script
3. The database will be ready for use with the OFSL application

Note: Some functions reference auth.uid() and auth.jwt() which are Supabase-specific
functions. If deploying to a different PostgreSQL setup, these would need to be
adapted or replaced with your authentication system's equivalent functions.
*/