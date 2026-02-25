import { sql } from '@/lib/db';

let eventStateTablesReady: Promise<void> | null = null;

async function ensureEventStateTables() {
  if (!eventStateTablesReady) {
    eventStateTablesReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          location TEXT,
          date DATE,
          status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'closed')),
          config JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS event_state (
          id TEXT PRIMARY KEY,
          event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          module_key TEXT NOT NULL,
          payload JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          CONSTRAINT uq_event_state_event_module UNIQUE (event_id, module_key)
        );
      `;
    })();
  }

  await eventStateTablesReady;
}

export type EventModuleKey =
  | 'pilots'
  | 'timeAttack'
  | 'qualy'
  | 'teams'
  | 'races'
  | 'results'
  | 'raffles'
  | 'rafflesHistory';

export async function getEventModulePayload(eventId: string, moduleKey: EventModuleKey): Promise<unknown | null> {
  await ensureEventStateTables();
  const { rows } = await sql<{ payload: unknown }>`
    SELECT payload
    FROM event_state
    WHERE event_id = ${eventId} AND module_key = ${moduleKey}
    LIMIT 1;
  `;

  return rows[0]?.payload ?? null;
}

export async function saveEventModulePayload(eventId: string, moduleKey: EventModuleKey, payload: unknown): Promise<void> {
  await ensureEventStateTables();
  const id = crypto.randomUUID();

  await sql`
    INSERT INTO event_state (id, event_id, module_key, payload, updated_at)
    VALUES (${id}, ${eventId}, ${moduleKey}, ${JSON.stringify(payload)}::jsonb, NOW())
    ON CONFLICT (event_id, module_key)
    DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW();
  `;
}

export async function deleteEventModulePayload(eventId: string, moduleKey: EventModuleKey): Promise<void> {
  await ensureEventStateTables();
  await sql`
    DELETE FROM event_state
    WHERE event_id = ${eventId} AND module_key = ${moduleKey};
  `;
}
