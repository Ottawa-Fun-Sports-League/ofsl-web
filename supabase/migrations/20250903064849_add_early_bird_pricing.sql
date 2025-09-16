-- Add early bird pricing fields to leagues and update payment logic

-- 1) Add columns to leagues table (idempotent checks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leagues' AND column_name = 'early_bird_cost'
  ) THEN
    ALTER TABLE leagues ADD COLUMN early_bird_cost numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leagues' AND column_name = 'early_bird_due_date'
  ) THEN
    ALTER TABLE leagues ADD COLUMN early_bird_due_date date;
  END IF;
END $$;

-- 2) Helper SQL function to compute effective league cost (considers early bird window)
CREATE OR REPLACE FUNCTION effective_league_cost(l leagues)
RETURNS numeric(10,2)
LANGUAGE sql
AS $$
  SELECT COALESCE(
    CASE 
      WHEN l.early_bird_due_date IS NOT NULL 
           AND l.early_bird_cost IS NOT NULL 
           AND CURRENT_DATE <= l.early_bird_due_date 
        THEN l.early_bird_cost
      ELSE l.cost
    END,
    0.00
  )::numeric(10,2);
$$;

-- 3) Update trigger that creates league payments when teams are created
--    to use the effective league cost at time of creation.
CREATE OR REPLACE FUNCTION create_league_payment_for_team()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new team is created, create a league payment record for the captain
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
      effective_league_cost(l),
      COALESCE(l.payment_due_date, (CURRENT_DATE + INTERVAL '30 days')::date),
      'pending'
    FROM leagues l
    WHERE l.id = NEW.league_id
      AND COALESCE(effective_league_cost(l), 0.00) > 0; -- Only create if there's a cost
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4) Recreate/replace the user_payment_summary view to compute dynamic due
--    so unpaid records reflect current effective pricing while paid stay fixed.
DROP VIEW IF EXISTS user_payment_summary;
CREATE VIEW user_payment_summary WITH (security_invoker = true) AS
SELECT 
  lp.user_id,
  l.name AS league_name,
  t.name AS team_name,
  -- If paid, keep recorded amount_due; else use current effective cost
  (CASE 
     WHEN lp.status = 'paid' THEN lp.amount_due
     ELSE effective_league_cost(l)
   END)::numeric(10,2) AS amount_due,
  lp.amount_paid,
  GREATEST(0,
    (CASE 
       WHEN lp.status = 'paid' THEN lp.amount_due
       ELSE effective_league_cost(l)
     END) - lp.amount_paid
  )::numeric(10,2) AS amount_outstanding,
  (CASE 
     WHEN lp.status = 'paid' THEN 'paid'::payment_status_enum
     WHEN lp.amount_paid > 0 AND (CASE WHEN lp.status = 'overdue' THEN true ELSE false END) THEN 'overdue'::payment_status_enum
     WHEN lp.amount_paid > 0 THEN 'partial'::payment_status_enum
     WHEN lp.due_date IS NOT NULL AND lp.due_date < CURRENT_DATE THEN 'overdue'::payment_status_enum
     ELSE 'pending'::payment_status_enum
   END) AS status,
  lp.due_date,
  lp.payment_method,
  lp.created_at,
  lp.updated_at
FROM league_payments lp
JOIN leagues l ON l.id = lp.league_id
LEFT JOIN teams t ON t.id = lp.team_id
WHERE lp.user_id = get_current_user_id()
ORDER BY lp.due_date ASC NULLS LAST, lp.created_at DESC;

GRANT SELECT ON user_payment_summary TO authenticated;
;
