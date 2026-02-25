BEGIN;

-- =========================================================
-- GP Pistón - PostgreSQL schema (Vercel Postgres / Next.js)
-- =========================================================

-- 1) EVENTS
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  date DATE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'closed')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2) PILOTS
CREATE TABLE IF NOT EXISTS pilots (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
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

-- 3) TIME ATTACK SESSIONS
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

-- 4) TIME ATTACK TIMES
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

-- 5) QUALY SESSIONS
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

-- 6) QUALY TIMES
CREATE TABLE IF NOT EXISTS qualy_times (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES qualy_sessions(id) ON DELETE CASCADE,
  pilot_id TEXT NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  raw_time NUMERIC,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_qualy_times_session_pilot UNIQUE (session_id, pilot_id)
);

CREATE INDEX IF NOT EXISTS idx_qualy_times_session_pilot ON qualy_times(session_id, pilot_id);

-- 7) TEAMS
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_event_id ON teams(event_id);

-- 8) TEAM MEMBERS
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  pilot_id TEXT NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  position_in_team INTEGER,
  CONSTRAINT uq_team_members_team_pilot UNIQUE (team_id, pilot_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team_pilot ON team_members(team_id, pilot_id);
CREATE INDEX IF NOT EXISTS idx_team_members_pilot_id ON team_members(pilot_id);

-- 9) RACE PARRILLAS
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

-- 10) RACE RESULTS
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

-- 11) RAFFLES
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

-- 12) RAFFLES HISTORY
CREATE TABLE IF NOT EXISTS raffles_history (
  id TEXT PRIMARY KEY,
  raffle_id TEXT NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  pilot_id TEXT NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_raffles_history_raffle_pilot UNIQUE (raffle_id, pilot_id)
);

CREATE INDEX IF NOT EXISTS idx_raffles_history_raffle_id ON raffles_history(raffle_id);
CREATE INDEX IF NOT EXISTS idx_raffles_history_pilot_id ON raffles_history(pilot_id);

-- =========================
-- Sample data (real values)
-- =========================

-- 1 event
INSERT INTO events (id, name, location, date, status, config)
VALUES (
  'evt_gp_piston_2026_valencia',
  'GP Pistón Valencia 2026',
  'Valencia',
  '2026-03-21',
  'active',
  '{
    "maxPilots": 80,
    "timeAttackSessions": 2,
    "qualyGroups": 2,
    "teamsCount": 2
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 5 pilots
INSERT INTO pilots (id, event_id, number, name, apellidos, edad, telefono, redes_sociales, peso, nivel, has_time_attack)
VALUES
  ('pil_001', 'evt_gp_piston_2026_valencia', 1, 'Adrián', 'Lozano', 24, '+34600111222', '@adrian.lozano', 72.5, 'PRO', TRUE),
  ('pil_002', 'evt_gp_piston_2026_valencia', 2, 'Marta', 'Rivas', 22, '+34600333444', '@marta.rivas', 61.2, 'AMATEUR', TRUE),
  ('pil_003', 'evt_gp_piston_2026_valencia', 3, 'Sergio', 'Peña', 28, '+34600555666', '@sergio.pena', 78.0, 'PRO', TRUE),
  ('pil_004', 'evt_gp_piston_2026_valencia', 4, 'Lucía', 'Bermúdez', 20, '+34600777888', '@lucia.bermudez', 58.4, 'PRINCIPIANTE', FALSE),
  ('pil_005', 'evt_gp_piston_2026_valencia', 5, 'Carlos', 'Mendoza', 26, '+34600999000', '@carlos.mendoza', 74.3, 'AMATEUR', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 2 TA sessions
INSERT INTO time_attack_sessions (id, event_id, name, start_time, duration, max_capacity, status)
VALUES
  ('ta_sess_01', 'evt_gp_piston_2026_valencia', 'T1', '2026-03-21 09:30:00', 10, 20, 'pending'),
  ('ta_sess_02', 'evt_gp_piston_2026_valencia', 'T2', '2026-03-21 09:45:00', 10, 20, 'pending')
ON CONFLICT (id) DO NOTHING;

-- TA times (optional support data)
INSERT INTO time_attack_times (id, session_id, pilot_id, raw_time, corrected_time, reference_time_flag)
VALUES
  ('ta_time_001', 'ta_sess_01', 'pil_001', 49.122, 49.122, TRUE),
  ('ta_time_002', 'ta_sess_01', 'pil_002', 50.011, 50.011, FALSE),
  ('ta_time_003', 'ta_sess_02', 'pil_003', 48.874, 48.874, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 2 Qualy sessions
INSERT INTO qualy_sessions (id, event_id, name, group_name, start_time, duration, status)
VALUES
  ('q_sess_01', 'evt_gp_piston_2026_valencia', 'Q1', 'Grupo 1', '2026-03-21 11:30:00', 5, 'completed'),
  ('q_sess_02', 'evt_gp_piston_2026_valencia', 'Q2', 'Grupo 2', '2026-03-21 11:40:00', 5, 'completed')
ON CONFLICT (id) DO NOTHING;

-- Qualy times (optional support data)
INSERT INTO qualy_times (id, session_id, pilot_id, raw_time)
VALUES
  ('q_time_001', 'q_sess_01', 'pil_001', 48.901),
  ('q_time_002', 'q_sess_01', 'pil_002', 49.772),
  ('q_time_003', 'q_sess_02', 'pil_003', 48.655),
  ('q_time_004', 'q_sess_02', 'pil_004', 51.114),
  ('q_time_005', 'q_sess_02', 'pil_005', 49.998)
ON CONFLICT (id) DO NOTHING;

-- 2 teams
INSERT INTO teams (id, event_id, name)
VALUES
  ('team_01', 'evt_gp_piston_2026_valencia', 'Equipo 1'),
  ('team_02', 'evt_gp_piston_2026_valencia', 'Equipo 2')
ON CONFLICT (id) DO NOTHING;

-- Team members
INSERT INTO team_members (id, team_id, pilot_id, position_in_team)
VALUES
  ('tm_001', 'team_01', 'pil_001', 1),
  ('tm_002', 'team_01', 'pil_004', 2),
  ('tm_003', 'team_02', 'pil_002', 1),
  ('tm_004', 'team_02', 'pil_003', 2),
  ('tm_005', 'team_02', 'pil_005', 3)
ON CONFLICT (id) DO NOTHING;

-- 1 parrilla row
INSERT INTO race_parrillas (id, event_id, race_number, category, pilot_id, start_position, kart_cc)
VALUES
  ('parr_001', 'evt_gp_piston_2026_valencia', 1, '390', 'pil_001', 1, 390)
ON CONFLICT (id) DO NOTHING;

-- 1 race result row
INSERT INTO race_results (id, event_id, race_number, pilot_id, final_position, points_base, bonus_collective, bonus_individual, total_points)
VALUES
  ('rr_001', 'evt_gp_piston_2026_valencia', 1, 'pil_001', 1, 40, 20, 20, 80)
ON CONFLICT (id) DO NOTHING;

-- 1 raffle with winner
INSERT INTO raffles (
  id, event_id, title, description, rules, allow_duplicates, winner_id, participants_snapshot
)
VALUES (
  'raff_001',
  'evt_gp_piston_2026_valencia',
  'Sorteo Pase GP Pistón',
  'Sorteo principal del evento',
  '{
    "onlyConfirmed": false,
    "excludeDisqualified": true,
    "excludePreviousWinners": true,
    "only270": false,
    "only390": false,
    "onlyTimeAttack": false
  }'::jsonb,
  false,
  'pil_003',
  '[
    {"id":"pil_001","name":"Adrián Lozano","number":"1"},
    {"id":"pil_002","name":"Marta Rivas","number":"2"},
    {"id":"pil_003","name":"Sergio Peña","number":"3"},
    {"id":"pil_004","name":"Lucía Bermúdez","number":"4"},
    {"id":"pil_005","name":"Carlos Mendoza","number":"5"}
  ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO raffles_history (id, raffle_id, pilot_id)
VALUES
  ('rh_001', 'raff_001', 'pil_003')
ON CONFLICT (id) DO NOTHING;

COMMIT;
