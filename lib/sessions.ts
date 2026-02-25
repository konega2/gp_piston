import { sql } from '@/lib/db';

export type TimeAttackSessionDB = {
  id: string;
  event_id: string;
  name: string | null;
  start_time: string | Date | null;
  duration: number | null;
  max_capacity: number | null;
  status: 'pending' | 'closed' | null;
  created_at: string | Date;
};

export type QualySessionDB = {
  id: string;
  event_id: string;
  name: string | null;
  group_name: string | null;
  start_time: string | Date | null;
  duration: number | null;
  status: 'pending' | 'completed' | null;
  created_at: string | Date;
};

const asTimestamp = (value: string | Date | null | undefined) => {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
};

export async function getTimeAttackSessionsByEvent(eventId: string): Promise<TimeAttackSessionDB[]> {
  const { rows } = await sql<TimeAttackSessionDB>`
    SELECT *
    FROM time_attack_sessions
    WHERE event_id = ${eventId}
    ORDER BY created_at ASC;
  `;
  return rows;
}

export async function getQualySessionsByEvent(eventId: string): Promise<QualySessionDB[]> {
  const { rows } = await sql<QualySessionDB>`
    SELECT *
    FROM qualy_sessions
    WHERE event_id = ${eventId}
    ORDER BY created_at ASC;
  `;
  return rows;
}

export async function createTimeAttackSession(eventId: string, data: Omit<TimeAttackSessionDB, 'id' | 'event_id' | 'created_at'>): Promise<string> {
  const id = crypto.randomUUID();
  await sql`
    INSERT INTO time_attack_sessions (id, event_id, name, start_time, duration, max_capacity, status)
    VALUES (
      ${id},
      ${eventId},
      ${data.name ?? null},
      ${asTimestamp(data.start_time)},
      ${data.duration ?? null},
      ${data.max_capacity ?? null},
      ${data.status ?? 'pending'}
    );
  `;
  return id;
}

export async function updateTimeAttackSession(eventId: string, sessionId: string, data: Partial<Omit<TimeAttackSessionDB, 'id' | 'event_id' | 'created_at'>>): Promise<void> {
  await sql`
    UPDATE time_attack_sessions
    SET
      name = COALESCE(${data.name ?? null}, name),
      start_time = COALESCE(${asTimestamp(data.start_time)}, start_time),
      duration = COALESCE(${data.duration ?? null}, duration),
      max_capacity = COALESCE(${data.max_capacity ?? null}, max_capacity),
      status = COALESCE(${data.status ?? null}, status)
    WHERE id = ${sessionId} AND event_id = ${eventId};
  `;
}

export async function deleteTimeAttackSession(eventId: string, sessionId: string): Promise<void> {
  await sql`DELETE FROM time_attack_sessions WHERE id = ${sessionId} AND event_id = ${eventId};`;
}

export async function createQualySession(eventId: string, data: Omit<QualySessionDB, 'id' | 'event_id' | 'created_at'>): Promise<string> {
  const id = crypto.randomUUID();
  await sql`
    INSERT INTO qualy_sessions (id, event_id, name, group_name, start_time, duration, status)
    VALUES (
      ${id},
      ${eventId},
      ${data.name ?? null},
      ${data.group_name ?? null},
      ${asTimestamp(data.start_time)},
      ${data.duration ?? null},
      ${data.status ?? 'pending'}
    );
  `;
  return id;
}

export async function updateQualySession(eventId: string, sessionId: string, data: Partial<Omit<QualySessionDB, 'id' | 'event_id' | 'created_at'>>): Promise<void> {
  await sql`
    UPDATE qualy_sessions
    SET
      name = COALESCE(${data.name ?? null}, name),
      group_name = COALESCE(${data.group_name ?? null}, group_name),
      start_time = COALESCE(${asTimestamp(data.start_time)}, start_time),
      duration = COALESCE(${data.duration ?? null}, duration),
      status = COALESCE(${data.status ?? null}, status)
    WHERE id = ${sessionId} AND event_id = ${eventId};
  `;
}

export async function deleteQualySession(eventId: string, sessionId: string): Promise<void> {
  await sql`DELETE FROM qualy_sessions WHERE id = ${sessionId} AND event_id = ${eventId};`;
}
