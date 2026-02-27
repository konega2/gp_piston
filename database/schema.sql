BEGIN;

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  date DATE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'closed')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_pilots_event_id ON pilots(event_id);

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

CREATE TABLE IF NOT EXISTS time_attack_times (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES time_attack_sessions(id) ON DELETE CASCADE,
  pilot_id TEXT NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  raw_time NUMERIC,
  corrected_time NUMERIC,
  reference_time_flag BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_ta_times_session_pilot UNIQUE (session_id, pilot_id)
);

CREATE INDEX IF NOT EXISTS idx_ta_times_session_pilot ON time_attack_times(session_id, pilot_id);

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

CREATE TABLE IF NOT EXISTS qualy_times (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES qualy_sessions(id) ON DELETE CASCADE,
  pilot_id TEXT NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  raw_time NUMERIC,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_qualy_times_session_pilot UNIQUE (session_id, pilot_id)
);

CREATE INDEX IF NOT EXISTS idx_qualy_times_session_pilot ON qualy_times(session_id, pilot_id);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_event_id ON teams(event_id);

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  pilot_id TEXT NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  position_in_team INTEGER,
  CONSTRAINT uq_team_members_team_pilot UNIQUE (team_id, pilot_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team_pilot ON team_members(team_id, pilot_id);
CREATE INDEX IF NOT EXISTS idx_team_members_pilot_id ON team_members(pilot_id);

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
  points_base INTEGER NOT NULL,
  bonus_collective INTEGER NOT NULL DEFAULT 0,
  bonus_individual INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_race_results_event_race_pilot UNIQUE (event_id, race_number, pilot_id)
);

CREATE INDEX IF NOT EXISTS idx_race_results_event_race ON race_results(event_id, race_number);

CREATE TABLE IF NOT EXISTS raffles (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  allow_duplicates BOOLEAN NOT NULL DEFAULT FALSE,
  winner_id TEXT REFERENCES pilots(id) ON DELETE SET NULL,
  participants_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raffles_event_id ON raffles(event_id);
CREATE INDEX IF NOT EXISTS idx_raffles_winner_id ON raffles(winner_id);

CREATE TABLE IF NOT EXISTS raffles_history (
  id TEXT PRIMARY KEY,
  raffle_id TEXT NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  pilot_id TEXT NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_raffles_history_raffle_pilot UNIQUE (raffle_id, pilot_id)
);

CREATE INDEX IF NOT EXISTS idx_raffles_history_raffle_id ON raffles_history(raffle_id);
CREATE INDEX IF NOT EXISTS idx_raffles_history_pilot_id ON raffles_history(pilot_id);

COMMIT;
