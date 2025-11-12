-- Add relative payment window support for leagues
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS payment_window_hours INTEGER;

COMMENT ON COLUMN leagues.payment_window_hours IS 'Number of hours registrants have to pay after signing up when payment_due_date is not used.';

-- Ensure payment status trigger sets due dates based on either absolute date or relative window
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  league_record RECORD;
  team_created_at TIMESTAMPTZ;
  reference_timestamp TIMESTAMPTZ;
BEGIN
  IF NEW.due_date IS NULL THEN
    SELECT payment_due_date, payment_window_hours
    INTO league_record
    FROM leagues
    WHERE id = NEW.league_id;

    IF league_record.payment_window_hours IS NOT NULL THEN
      IF NEW.team_id IS NOT NULL THEN
        SELECT created_at INTO team_created_at FROM teams WHERE id = NEW.team_id;
      END IF;

      reference_timestamp := COALESCE(team_created_at, NEW.created_at, NOW());
      NEW.due_date := (
        reference_timestamp + (league_record.payment_window_hours || ' hours')::interval
      )::date;
    ELSIF league_record.payment_due_date IS NOT NULL THEN
      NEW.due_date := league_record.payment_due_date;
    ELSE
      NEW.due_date := (CURRENT_DATE + INTERVAL '30 days')::date;
    END IF;
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
  
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Update sync trigger to account for payment windows
CREATE OR REPLACE FUNCTION sync_league_payment_due_dates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (OLD.payment_due_date IS DISTINCT FROM NEW.payment_due_date)
     OR (OLD.payment_window_hours IS DISTINCT FROM NEW.payment_window_hours) THEN
    UPDATE league_payments lp
    SET due_date = CASE
      WHEN NEW.payment_window_hours IS NOT NULL THEN (
        (
          COALESCE(
            (SELECT t.created_at FROM teams t WHERE t.id = lp.team_id),
            lp.created_at,
            NOW()
          ) + (NEW.payment_window_hours || ' hours')::interval
        )::date
      )
      ELSE NEW.payment_due_date
    END
    WHERE lp.league_id = NEW.id
      AND lp.status != 'paid';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update team payment creation to prefer payment windows when available
CREATE OR REPLACE FUNCTION create_league_payment_for_team()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.captain_id IS NOT NULL AND NEW.league_id IS NOT NULL THEN
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
      CASE
        WHEN l.payment_window_hours IS NOT NULL THEN (
          COALESCE(NEW.created_at, NOW()) + (l.payment_window_hours || ' hours')::interval
        )::date
        ELSE COALESCE(l.payment_due_date, (CURRENT_DATE + INTERVAL '30 days')::date)
      END,
      'pending'
    FROM leagues l
    WHERE l.id = NEW.league_id
      AND COALESCE(l.cost, 0.00) > 0;
  END IF;
  
  RETURN NEW;
END;
$$;
