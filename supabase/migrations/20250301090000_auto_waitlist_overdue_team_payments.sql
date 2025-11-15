-- Migration: enforce team payment windows and notify captains when moved to waitlist

-- 1. Create queue table for waitlist notifications
CREATE TABLE IF NOT EXISTS team_waitlist_notifications (
    id BIGSERIAL PRIMARY KEY,
    payment_id BIGINT NOT NULL REFERENCES league_payments(id) ON DELETE CASCADE,
    team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    league_id BIGINT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email TEXT,
    user_name TEXT,
    team_name TEXT,
    league_name TEXT,
    payment_window_hours INTEGER,
    registration_timestamp TIMESTAMP WITH TIME ZONE,
    reason TEXT DEFAULT 'payment_window_expired',
    sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_waitlist_notifications_payment
  ON team_waitlist_notifications(payment_id);

CREATE INDEX IF NOT EXISTS idx_team_waitlist_notifications_unsent
  ON team_waitlist_notifications(sent, created_at)
  WHERE sent = false;

ALTER TABLE team_waitlist_notifications ENABLE ROW LEVEL SECURITY;
-- Only service role (Edge functions) should manage this table; RLS policies can restrict others as needed.

-- 2. Update the payment status trigger to respect payment windows and enqueue notifications
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  league_record RECORD;
  team_record RECORD;
  league_name TEXT;
  user_record RECORD;
  team_created_at TIMESTAMPTZ;
  reference_timestamp TIMESTAMPTZ := COALESCE(NEW.created_at, NOW());
  waitlist_deadline TIMESTAMPTZ;
  should_waitlist BOOLEAN := false;
BEGIN
  SELECT payment_due_date, payment_window_hours, name
  INTO league_record
  FROM leagues
  WHERE id = NEW.league_id;

  IF NEW.team_id IS NOT NULL THEN
    SELECT created_at, name INTO team_record FROM teams WHERE id = NEW.team_id;
    reference_timestamp := COALESCE(team_record.created_at, NEW.created_at, reference_timestamp);
  END IF;

  IF NEW.due_date IS NULL THEN
    IF league_record.payment_window_hours IS NOT NULL THEN
      waitlist_deadline := reference_timestamp + (league_record.payment_window_hours || ' hours')::interval;
      NEW.due_date := waitlist_deadline::date;
    ELSIF league_record.payment_due_date IS NOT NULL THEN
      NEW.due_date := league_record.payment_due_date;
    ELSE
      NEW.due_date := (CURRENT_DATE + INTERVAL '30 days')::date;
    END IF;
  ELSIF league_record.payment_window_hours IS NOT NULL AND waitlist_deadline IS NULL THEN
    waitlist_deadline := reference_timestamp + (league_record.payment_window_hours || ' hours')::interval;
  END IF;

  IF league_record.payment_window_hours IS NOT NULL
     AND NEW.team_id IS NOT NULL
     AND waitlist_deadline IS NOT NULL
     AND waitlist_deadline <= NOW() THEN
    should_waitlist := true;
  END IF;

  IF NEW.amount_paid >= NEW.amount_due THEN
    NEW.status = 'paid';
  ELSIF NEW.amount_paid > 0 THEN
    NEW.status = 'partial';
  ELSIF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN
    NEW.status = 'overdue';
  ELSE
    NEW.status = 'pending';
  END IF;

  IF should_waitlist AND (NEW.amount_paid < COALESCE(NEW.amount_due, 0)) THEN
    NEW.status := 'overdue';
    IF NEW.is_waitlisted IS DISTINCT FROM TRUE THEN
      NEW.is_waitlisted := true;

      IF NEW.team_id IS NOT NULL THEN
        UPDATE teams
        SET active = false
        WHERE id = NEW.team_id
          AND COALESCE(active, true) = true;
      END IF;

      -- Queue waitlist notification for the team captain
      SELECT id AS user_id, email, name INTO user_record
      FROM users
      WHERE id = NEW.user_id;

      INSERT INTO team_waitlist_notifications (
        payment_id,
        team_id,
        league_id,
        user_id,
        email,
        user_name,
        team_name,
        league_name,
        payment_window_hours,
        registration_timestamp,
        reason
      )
      VALUES (
        NEW.id,
        NEW.team_id,
        NEW.league_id,
        COALESCE(user_record.user_id, NEW.user_id),
        user_record.email,
        COALESCE(user_record.name, 'Team Captain'),
        COALESCE(team_record.name, 'Team'),
        league_record.name,
        league_record.payment_window_hours,
        reference_timestamp,
        'payment_window_expired'
      )
      ON CONFLICT (payment_id) DO NOTHING;
    END IF;
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
