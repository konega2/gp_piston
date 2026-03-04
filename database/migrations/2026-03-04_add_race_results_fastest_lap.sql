BEGIN;

ALTER TABLE race_results
  ADD COLUMN IF NOT EXISTS fastest_lap_seconds NUMERIC;

COMMIT;
