-- Ensure transfer history records don't block league deletion
ALTER TABLE team_transfer_history
  DROP CONSTRAINT IF EXISTS team_transfer_history_from_league_id_fkey;

ALTER TABLE team_transfer_history
  ADD CONSTRAINT team_transfer_history_from_league_id_fkey
  FOREIGN KEY (from_league_id)
  REFERENCES leagues(id)
  ON DELETE CASCADE;

ALTER TABLE team_transfer_history
  DROP CONSTRAINT IF EXISTS team_transfer_history_to_league_id_fkey;

ALTER TABLE team_transfer_history
  ADD CONSTRAINT team_transfer_history_to_league_id_fkey
  FOREIGN KEY (to_league_id)
  REFERENCES leagues(id)
  ON DELETE CASCADE;

ALTER TABLE individual_transfer_history
  DROP CONSTRAINT IF EXISTS individual_transfer_history_from_league_id_fkey;

ALTER TABLE individual_transfer_history
  ADD CONSTRAINT individual_transfer_history_from_league_id_fkey
  FOREIGN KEY (from_league_id)
  REFERENCES leagues(id)
  ON DELETE CASCADE;

ALTER TABLE individual_transfer_history
  DROP CONSTRAINT IF EXISTS individual_transfer_history_to_league_id_fkey;

ALTER TABLE individual_transfer_history
  ADD CONSTRAINT individual_transfer_history_to_league_id_fkey
  FOREIGN KEY (to_league_id)
  REFERENCES leagues(id)
  ON DELETE CASCADE;
