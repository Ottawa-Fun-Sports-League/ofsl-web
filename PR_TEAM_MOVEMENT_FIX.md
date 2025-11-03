Summary

- Move team placement to server RPC to avoid RLS issues when facilitators submit scores.
- Ensures immediate next-week movement for both admins and facilitators.

Changes

- Add SECURITY DEFINER RPC: public.apply_next_week_assignments (ensures dest tiers exist, clears duplicates, applies placements, optionally marks is_completed).
- Route movement functions to RPC for: 3-team, 2-team (incl. elite), 4-team head-to-head, 6-team head-to-head, Elite 3-team.
- Make client is_completed updates best-effort (RPC ensures marking), avoiding facilitator failures.

Migrations

- supabase/migrations/20251103150500_add_apply_next_week_assignments_rpc.sql

Testing Notes

- Submit scores as facilitator for each supported format; verify next-week schedule updates immediately.
- Confirm standings recalculation still runs and no duplicate placements occur.

Notes

- RPC authorizes admins/facilitators via users.auth_id = auth.uid().
- If a target tier row is missing in the dest week, RPC creates it using the current week’s template (defaults to 3-teams-6-sets when unknown).
