-- Automatically waitlist team registrations whose payment window has expired without payment
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  league_record RECORD;
  team_created_at TIMESTAMPTZ;
  reference_timestamp TIMESTAMPTZ := COALESCE(NEW.created_at, NOW());
  waitlist_deadline TIMESTAMPTZ;
  should_waitlist BOOLEAN := false;
BEGIN
  SELECT payment_due_date, payment_window_hours
  INTO league_record
  FROM leagues
  WHERE id = NEW.league_id;

  IF NEW.team_id IS NOT NULL THEN
    SELECT created_at INTO team_created_at FROM teams WHERE id = NEW.team_id;
    reference_timestamp := COALESCE(team_created_at, NEW.created_at, reference_timestamp);
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
    END IF;
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
