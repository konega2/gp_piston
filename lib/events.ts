import { sql } from '@/lib/db';

export type EventRow = {
  id: string;
  name: string;
  location: string | null;
  date: string | Date | null;
  status: 'draft' | 'active' | 'closed';
  config: {
    maxPilots?: number;
    sessionMaxCapacity?: number;
    timeAttackSessions?: number;
    qualyGroups?: number;
    teamsCount?: number;
    raceCount?: number;
  } | null;
  created_at: string | Date;
};

export type EventInput = {
  name: string;
  date: string;
  location: string;
  maxParticipants: number;
  sessionMaxCapacity: number;
  teamsCount: number;
  timeAttackSessions: number;
  qualyGroups: number;
  raceCount: number;
};

const ensureValidEventInput = (data: EventInput) => {
  if (!data.name.trim() || !data.date.trim() || !data.location.trim()) {
    throw new Error('Datos de evento inválidos.');
  }

  const numericValues = [
    data.maxParticipants,
    data.sessionMaxCapacity,
    data.teamsCount,
    data.timeAttackSessions,
    data.qualyGroups,
    data.raceCount
  ];

  if (numericValues.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new Error('Datos de evento inválidos.');
  }
};

export async function getEvents(): Promise<EventRow[]> {
  const { rows } = await sql<EventRow>`SELECT * FROM events ORDER BY created_at DESC;`;
  return rows;
}

export async function getEventById(id: string): Promise<EventRow | null> {
  const { rows } = await sql<EventRow>`SELECT * FROM events WHERE id = ${id} LIMIT 1;`;
  return rows[0] ?? null;
}

export async function createEvent(data: EventInput): Promise<string> {
  ensureValidEventInput(data);

  const id = crypto.randomUUID();
  const config = {
    maxPilots: data.maxParticipants,
    timeAttackSessions: data.timeAttackSessions,
    qualyGroups: data.qualyGroups,
    teamsCount: data.teamsCount,
    raceCount: data.raceCount,
    sessionMaxCapacity: data.sessionMaxCapacity
  };

  try {
    await sql`
      INSERT INTO events (id, name, location, date, status, config)
      VALUES (${id}, ${data.name.trim()}, ${data.location.trim()}, ${data.date}, ${'active'}, ${JSON.stringify(config)}::jsonb);
    `;
    return id;
  } catch {
    throw new Error('No se pudo crear el evento.');
  }
}

export async function updateEvent(id: string, data: EventInput): Promise<void> {
  ensureValidEventInput(data);

  const config = {
    maxPilots: data.maxParticipants,
    timeAttackSessions: data.timeAttackSessions,
    qualyGroups: data.qualyGroups,
    teamsCount: data.teamsCount,
    raceCount: data.raceCount,
    sessionMaxCapacity: data.sessionMaxCapacity
  };

  try {
    await sql`
      UPDATE events
      SET
        name = ${data.name.trim()},
        location = ${data.location.trim()},
        date = ${data.date},
        config = ${JSON.stringify(config)}::jsonb
      WHERE id = ${id};
    `;
  } catch {
    throw new Error('No se pudo actualizar el evento.');
  }
}

export async function deleteEvent(id: string): Promise<void> {
  try {
    await sql`DELETE FROM events WHERE id = ${id};`;
  } catch {
    throw new Error('No se pudo eliminar el evento.');
  }
}