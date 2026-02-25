import { sql } from '@/lib/db';

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
  const { rows } = await sql<{ payload: unknown }>`
    SELECT payload
    FROM event_state
    WHERE event_id = ${eventId} AND module_key = ${moduleKey}
    LIMIT 1;
  `;

  return rows[0]?.payload ?? null;
}

export async function saveEventModulePayload(eventId: string, moduleKey: EventModuleKey, payload: unknown): Promise<void> {
  const id = crypto.randomUUID();

  await sql`
    INSERT INTO event_state (id, event_id, module_key, payload, updated_at)
    VALUES (${id}, ${eventId}, ${moduleKey}, ${JSON.stringify(payload)}::jsonb, NOW())
    ON CONFLICT (event_id, module_key)
    DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW();
  `;
}

export async function deleteEventModulePayload(eventId: string, moduleKey: EventModuleKey): Promise<void> {
  await sql`
    DELETE FROM event_state
    WHERE event_id = ${eventId} AND module_key = ${moduleKey};
  `;
}
