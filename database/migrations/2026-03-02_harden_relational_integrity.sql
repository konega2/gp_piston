BEGIN;

-- FASE D: Endurecimiento relacional por evento
-- Objetivo: impedir cruces entre eventos con integridad fuerte y FKs compuestas.
-- Política: no borrar datos; si hay datos corruptos, abortar migración con error explícito.

-- -----------------------------------------------------------------------------
-- 0) Tablas base (si faltan en entornos mínimos)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS time_attack_times (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  session_id TEXT NOT NULL,
  pilot_id TEXT NOT NULL,
  raw_time NUMERIC,
  corrected_time NUMERIC,
  reference_time_flag BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qualy_times (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  session_id TEXT NOT NULL,
  pilot_id TEXT NOT NULL,
  raw_time NUMERIC,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE team_members ADD COLUMN IF NOT EXISTS event_id TEXT;
ALTER TABLE race_results ADD COLUMN IF NOT EXISTS event_id TEXT;
ALTER TABLE race_parrillas ADD COLUMN IF NOT EXISTS event_id TEXT;
ALTER TABLE time_attack_times ADD COLUMN IF NOT EXISTS event_id TEXT;
ALTER TABLE qualy_times ADD COLUMN IF NOT EXISTS event_id TEXT;

-- -----------------------------------------------------------------------------
-- 1) Backfill event_id sin borrar datos
-- -----------------------------------------------------------------------------

UPDATE team_members tm
SET event_id = t.event_id
FROM teams t
WHERE tm.team_id = t.id
  AND (tm.event_id IS NULL OR tm.event_id <> t.event_id);

UPDATE race_results rr
SET event_id = p.event_id
FROM pilots p
WHERE rr.pilot_id = p.id
  AND (rr.event_id IS NULL OR rr.event_id <> p.event_id);

UPDATE race_parrillas rp
SET event_id = p.event_id
FROM pilots p
WHERE rp.pilot_id = p.id
  AND (rp.event_id IS NULL OR rp.event_id <> p.event_id);

UPDATE time_attack_times tat
SET event_id = tas.event_id
FROM time_attack_sessions tas
WHERE tat.session_id = tas.id
  AND (tat.event_id IS NULL OR tat.event_id <> tas.event_id);

UPDATE qualy_times qt
SET event_id = qs.event_id
FROM qualy_sessions qs
WHERE qt.session_id = qs.id
  AND (qt.event_id IS NULL OR qt.event_id <> qs.event_id);

-- -----------------------------------------------------------------------------
-- 2) Pre-checks de corrupción (abortan migración si hay cruces)
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM team_members WHERE event_id IS NULL;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'team_members sin event_id: % filas', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count FROM race_results WHERE event_id IS NULL;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'race_results sin event_id: % filas', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count FROM race_parrillas WHERE event_id IS NULL;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'race_parrillas sin event_id: % filas', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count FROM time_attack_times WHERE event_id IS NULL;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'time_attack_times sin event_id: % filas', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count FROM qualy_times WHERE event_id IS NULL;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'qualy_times sin event_id: % filas', v_count;
  END IF;

  SELECT COUNT(*)
  INTO v_count
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN pilots p ON p.id = tm.pilot_id
  WHERE tm.event_id <> t.event_id OR tm.event_id <> p.event_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'team_members con cruce de evento team/pilot: % filas', v_count;
  END IF;

  SELECT COUNT(*)
  INTO v_count
  FROM race_results rr
  JOIN pilots p ON p.id = rr.pilot_id
  WHERE rr.event_id <> p.event_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'race_results con cruce evento/pilot: % filas', v_count;
  END IF;

  SELECT COUNT(*)
  INTO v_count
  FROM race_parrillas rp
  JOIN pilots p ON p.id = rp.pilot_id
  WHERE rp.event_id <> p.event_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'race_parrillas con cruce evento/pilot: % filas', v_count;
  END IF;

  SELECT COUNT(*)
  INTO v_count
  FROM time_attack_times tat
  JOIN time_attack_sessions tas ON tas.id = tat.session_id
  JOIN pilots p ON p.id = tat.pilot_id
  WHERE tat.event_id <> tas.event_id OR tat.event_id <> p.event_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'time_attack_times con cruce evento/sesion/piloto: % filas', v_count;
  END IF;

  SELECT COUNT(*)
  INTO v_count
  FROM qualy_times qt
  JOIN qualy_sessions qs ON qs.id = qt.session_id
  JOIN pilots p ON p.id = qt.pilot_id
  WHERE qt.event_id <> qs.event_id OR qt.event_id <> p.event_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'qualy_times con cruce evento/sesion/piloto: % filas', v_count;
  END IF;
END $$;

ALTER TABLE team_members ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE race_results ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE race_parrillas ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE time_attack_times ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE qualy_times ALTER COLUMN event_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- 3) Claves únicas compuestas requeridas para FKs (event_id + id)
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_pilots_event_id_id') THEN
    ALTER TABLE pilots ADD CONSTRAINT uq_pilots_event_id_id UNIQUE (event_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_ta_sessions_event_id_id') THEN
    ALTER TABLE time_attack_sessions ADD CONSTRAINT uq_ta_sessions_event_id_id UNIQUE (event_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_qualy_sessions_event_id_id') THEN
    ALTER TABLE qualy_sessions ADD CONSTRAINT uq_qualy_sessions_event_id_id UNIQUE (event_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_teams_event_id_id') THEN
    ALTER TABLE teams ADD CONSTRAINT uq_teams_event_id_id UNIQUE (event_id, id);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4) Unicidad funcional por evento
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_ta_times_event_session_pilot') THEN
    ALTER TABLE time_attack_times
      ADD CONSTRAINT uq_ta_times_event_session_pilot UNIQUE (event_id, session_id, pilot_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_qualy_times_event_session_pilot') THEN
    ALTER TABLE qualy_times
      ADD CONSTRAINT uq_qualy_times_event_session_pilot UNIQUE (event_id, session_id, pilot_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_team_members_event_team_pilot') THEN
    ALTER TABLE team_members
      ADD CONSTRAINT uq_team_members_event_team_pilot UNIQUE (event_id, team_id, pilot_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_race_parrillas_event_race_pilot') THEN
    ALTER TABLE race_parrillas
      ADD CONSTRAINT uq_race_parrillas_event_race_pilot UNIQUE (event_id, race_number, pilot_id);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5) FKs compuestas por evento (con ON DELETE CASCADE coherente)
-- -----------------------------------------------------------------------------

ALTER TABLE time_attack_times DROP CONSTRAINT IF EXISTS time_attack_times_session_id_fkey;
ALTER TABLE time_attack_times DROP CONSTRAINT IF EXISTS time_attack_times_pilot_id_fkey;
ALTER TABLE time_attack_times DROP CONSTRAINT IF EXISTS time_attack_times_event_id_fkey;
ALTER TABLE time_attack_times DROP CONSTRAINT IF EXISTS fk_ta_times_event;
ALTER TABLE time_attack_times DROP CONSTRAINT IF EXISTS fk_ta_times_event_session;
ALTER TABLE time_attack_times DROP CONSTRAINT IF EXISTS fk_ta_times_event_pilot;

ALTER TABLE time_attack_times
  ADD CONSTRAINT fk_ta_times_event
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE time_attack_times
  ADD CONSTRAINT fk_ta_times_event_session
  FOREIGN KEY (event_id, session_id)
  REFERENCES time_attack_sessions(event_id, id)
  ON DELETE CASCADE;

ALTER TABLE time_attack_times
  ADD CONSTRAINT fk_ta_times_event_pilot
  FOREIGN KEY (event_id, pilot_id)
  REFERENCES pilots(event_id, id)
  ON DELETE CASCADE;

ALTER TABLE qualy_times DROP CONSTRAINT IF EXISTS qualy_times_session_id_fkey;
ALTER TABLE qualy_times DROP CONSTRAINT IF EXISTS qualy_times_pilot_id_fkey;
ALTER TABLE qualy_times DROP CONSTRAINT IF EXISTS qualy_times_event_id_fkey;
ALTER TABLE qualy_times DROP CONSTRAINT IF EXISTS fk_qualy_times_event;
ALTER TABLE qualy_times DROP CONSTRAINT IF EXISTS fk_qualy_times_event_session;
ALTER TABLE qualy_times DROP CONSTRAINT IF EXISTS fk_qualy_times_event_pilot;

ALTER TABLE qualy_times
  ADD CONSTRAINT fk_qualy_times_event
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE qualy_times
  ADD CONSTRAINT fk_qualy_times_event_session
  FOREIGN KEY (event_id, session_id)
  REFERENCES qualy_sessions(event_id, id)
  ON DELETE CASCADE;

ALTER TABLE qualy_times
  ADD CONSTRAINT fk_qualy_times_event_pilot
  FOREIGN KEY (event_id, pilot_id)
  REFERENCES pilots(event_id, id)
  ON DELETE CASCADE;

ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_team_id_fkey;
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_pilot_id_fkey;
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_event_id_fkey;
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS fk_team_members_event;
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS fk_team_members_event_team;
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS fk_team_members_event_pilot;

ALTER TABLE team_members
  ADD CONSTRAINT fk_team_members_event
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE team_members
  ADD CONSTRAINT fk_team_members_event_team
  FOREIGN KEY (event_id, team_id)
  REFERENCES teams(event_id, id)
  ON DELETE CASCADE;

ALTER TABLE team_members
  ADD CONSTRAINT fk_team_members_event_pilot
  FOREIGN KEY (event_id, pilot_id)
  REFERENCES pilots(event_id, id)
  ON DELETE CASCADE;

ALTER TABLE race_results DROP CONSTRAINT IF EXISTS race_results_pilot_id_fkey;
ALTER TABLE race_results DROP CONSTRAINT IF EXISTS race_results_event_id_fkey;
ALTER TABLE race_results DROP CONSTRAINT IF EXISTS fk_race_results_event;
ALTER TABLE race_results DROP CONSTRAINT IF EXISTS fk_race_results_event_pilot;

ALTER TABLE race_results
  ADD CONSTRAINT fk_race_results_event
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE race_results
  ADD CONSTRAINT fk_race_results_event_pilot
  FOREIGN KEY (event_id, pilot_id)
  REFERENCES pilots(event_id, id)
  ON DELETE CASCADE;

ALTER TABLE race_parrillas DROP CONSTRAINT IF EXISTS race_parrillas_pilot_id_fkey;
ALTER TABLE race_parrillas DROP CONSTRAINT IF EXISTS race_parrillas_event_id_fkey;
ALTER TABLE race_parrillas DROP CONSTRAINT IF EXISTS fk_race_parrillas_event;
ALTER TABLE race_parrillas DROP CONSTRAINT IF EXISTS fk_race_parrillas_event_pilot;

ALTER TABLE race_parrillas
  ADD CONSTRAINT fk_race_parrillas_event
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE race_parrillas
  ADD CONSTRAINT fk_race_parrillas_event_pilot
  FOREIGN KEY (event_id, pilot_id)
  REFERENCES pilots(event_id, id)
  ON DELETE CASCADE;

-- -----------------------------------------------------------------------------
-- 6) Índices de soporte para joins/filtros por evento
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_ta_times_event_session ON time_attack_times(event_id, session_id);
CREATE INDEX IF NOT EXISTS idx_ta_times_event_pilot ON time_attack_times(event_id, pilot_id);

CREATE INDEX IF NOT EXISTS idx_qualy_times_event_session ON qualy_times(event_id, session_id);
CREATE INDEX IF NOT EXISTS idx_qualy_times_event_pilot ON qualy_times(event_id, pilot_id);

CREATE INDEX IF NOT EXISTS idx_team_members_event_team ON team_members(event_id, team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_event_pilot ON team_members(event_id, pilot_id);

CREATE INDEX IF NOT EXISTS idx_race_results_event_pilot ON race_results(event_id, pilot_id);
CREATE INDEX IF NOT EXISTS idx_race_parrillas_event_pilot ON race_parrillas(event_id, pilot_id);

COMMIT;
