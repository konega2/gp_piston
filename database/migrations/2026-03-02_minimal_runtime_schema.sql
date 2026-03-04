BEGIN;

-- 1) Elimina cualquier tabla que no sea necesaria para el estado actual del proyecto.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = current_schema()
      AND tablename NOT IN (
        'events',
        'event_state',
        'pilots',
        'time_attack_sessions',
        'qualy_sessions',
        'race_parrillas',
        'race_results'
      )
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE', current_schema(), table_name);
  END LOOP;
END
$$;

-- 2) Tablas mínimas requeridas por el código actual.
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  slug TEXT,
  name TEXT NOT NULL,
  location TEXT,
  date DATE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'closed')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE events
SET slug = LOWER(REGEXP_REPLACE(COALESCE(name, id), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL OR BTRIM(slug) = '';

ALTER TABLE events
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_events_slug
  ON events(slug);

CREATE TABLE IF NOT EXISTS event_state (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_event_state_event_module UNIQUE (event_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_event_state_event_id ON event_state(event_id);
CREATE INDEX IF NOT EXISTS idx_event_state_module_key ON event_state(module_key);

CREATE TABLE IF NOT EXISTS pilots (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  login_code TEXT,
  kart_number INTEGER,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  apellidos TEXT,
  edad INTEGER,
  telefono TEXT,
  redes_sociales TEXT,
  peso NUMERIC,
  nivel TEXT CHECK (nivel IN ('PRO', 'AMATEUR', 'PRINCIPIANTE')),
  has_time_attack BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pilots_event_number UNIQUE (event_id, number)
);

ALTER TABLE pilots
  ADD COLUMN IF NOT EXISTS login_code TEXT;

ALTER TABLE pilots
  ADD COLUMN IF NOT EXISTS kart_number INTEGER;

CREATE INDEX IF NOT EXISTS idx_pilots_event_id ON pilots(event_id);

CREATE UNIQUE INDEX IF NOT EXISTS pilots_login_code_unique_idx
  ON pilots ((UPPER(login_code)))
  WHERE login_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS time_attack_sessions (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT,
  start_time TIMESTAMP,
  duration INTEGER,
  max_capacity INTEGER,
  status TEXT CHECK (status IN ('pending', 'closed')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_attack_sessions_event_id ON time_attack_sessions(event_id);

CREATE TABLE IF NOT EXISTS qualy_sessions (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT,
  group_name TEXT,
  start_time TIMESTAMP,
  duration INTEGER,
  status TEXT CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qualy_sessions_event_id ON qualy_sessions(event_id);

CREATE TABLE IF NOT EXISTS race_parrillas (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  race_number INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('270', '390')),
  pilot_id TEXT NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  start_position INTEGER NOT NULL,
  kart_cc INTEGER NOT NULL CHECK (kart_cc IN (270, 390)),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_race_parrilla_slot UNIQUE (event_id, race_number, category, start_position)
);

CREATE INDEX IF NOT EXISTS idx_race_parrillas_event_race ON race_parrillas(event_id, race_number);

CREATE TABLE IF NOT EXISTS race_results (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  race_number INTEGER NOT NULL,
  pilot_id TEXT NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  final_position INTEGER NOT NULL,
  fastest_lap_seconds NUMERIC,
  points_base INTEGER NOT NULL,
  bonus_collective INTEGER NOT NULL DEFAULT 0,
  bonus_individual INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_race_results_event_race_pilot UNIQUE (event_id, race_number, pilot_id)
);

CREATE INDEX IF NOT EXISTS idx_race_results_event_race ON race_results(event_id, race_number);

COMMIT;
