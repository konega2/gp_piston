BEGIN;

-- Evento de ejemplo listo para usar.
-- Cambia los valores de id/slug/name/date/location si quieres otro evento.
INSERT INTO events (id, slug, name, location, date, status, config)
VALUES (
  'evt-gp-piston-2026-demo',
  'gp-piston-2026-demo',
  'GP PISTÓN 2026 · Demo',
  'Kartódromo Central',
  '2026-03-15',
  'active',
  '{
    "maxPilots": 24,
    "sessionMaxCapacity": 12,
    "timeAttackSessions": 2,
    "qualyGroups": 2,
    "teamsCount": 6,
    "raceCount": 2,
    "racesCount": 2
  }'::jsonb
)
ON CONFLICT (id)
DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  location = EXCLUDED.location,
  date = EXCLUDED.date,
  status = EXCLUDED.status,
  config = EXCLUDED.config;

-- Estado inicial por módulo para evitar nulls en runtime.
INSERT INTO event_state (id, event_id, module_key, payload, updated_at)
VALUES
  ('est-evt-demo-pilots', 'evt-gp-piston-2026-demo', 'pilots', '[]'::jsonb, NOW()),
  ('est-evt-demo-timeattack', 'evt-gp-piston-2026-demo', 'timeAttack', '[]'::jsonb, NOW()),
  ('est-evt-demo-qualy', 'evt-gp-piston-2026-demo', 'qualy', '[]'::jsonb, NOW()),
  ('est-evt-demo-teams', 'evt-gp-piston-2026-demo', 'teams', '[]'::jsonb, NOW()),
  ('est-evt-demo-races', 'evt-gp-piston-2026-demo', 'races', '[]'::jsonb, NOW()),
  ('est-evt-demo-results', 'evt-gp-piston-2026-demo', 'results', '[]'::jsonb, NOW()),
  ('est-evt-demo-raffles', 'evt-gp-piston-2026-demo', 'raffles', '[]'::jsonb, NOW()),
  ('est-evt-demo-raffles-history', 'evt-gp-piston-2026-demo', 'rafflesHistory', '[]'::jsonb, NOW())
ON CONFLICT (event_id, module_key)
DO UPDATE SET
  payload = EXCLUDED.payload,
  updated_at = NOW();

-- Sesiones base de Time Attack.
INSERT INTO time_attack_sessions (id, event_id, name, start_time, duration, max_capacity, status)
VALUES
  ('tas-evt-demo-1', 'evt-gp-piston-2026-demo', 'Time Attack · Sesión 1', '2026-03-15 09:00:00', 12, 12, 'pending'),
  ('tas-evt-demo-2', 'evt-gp-piston-2026-demo', 'Time Attack · Sesión 2', '2026-03-15 10:00:00', 12, 12, 'pending')
ON CONFLICT (id) DO NOTHING;

-- Sesiones base de Qualy.
INSERT INTO qualy_sessions (id, event_id, name, group_name, start_time, duration, status)
VALUES
  ('qly-evt-demo-a', 'evt-gp-piston-2026-demo', 'Clasificación A', 'Grupo A', '2026-03-15 11:00:00', 10, 'pending'),
  ('qly-evt-demo-b', 'evt-gp-piston-2026-demo', 'Clasificación B', 'Grupo B', '2026-03-15 11:30:00', 10, 'pending')
ON CONFLICT (id) DO NOTHING;

COMMIT;
