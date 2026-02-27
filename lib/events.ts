import { sql } from '@/lib/db';

let eventsTableReady: Promise<void> | null = null;

async function ensureEventsTable() {
  if (!eventsTableReady) {
    eventsTableReady = (async () => {
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
    })();
  }

  await eventsTableReady;
}

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

export type EventRuntimeConfigPatch = Partial<{
  maxPilots: number;
  sessionMaxCapacity: number;
  timeAttackSessions: number;
  qualyGroups: number;
  teamsCount: number;
  raceCount: number;
}>;

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
  await ensureEventsTable();
  const { rows } = await sql<EventRow>`SELECT * FROM events ORDER BY created_at DESC;`;
  return rows;
}

export async function getEventById(id: string): Promise<EventRow | null> {
  await ensureEventsTable();
  const { rows } = await sql<EventRow>`SELECT * FROM events WHERE id = ${id} LIMIT 1;`;
  return rows[0] ?? null;
}

export async function createEvent(data: EventInput): Promise<string> {
  ensureValidEventInput(data);
  await ensureEventsTable();

  const id = crypto.randomUUID();
  const config = {
    maxPilots: data.maxParticipants,
    timeAttackSessions: data.timeAttackSessions,
    qualyGroups: data.qualyGroups,
    teamsCount: data.teamsCount,
    raceCount: data.raceCount,
    racesCount: data.raceCount,
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
  await ensureEventsTable();

  const config = {
    maxPilots: data.maxParticipants,
    timeAttackSessions: data.timeAttackSessions,
    qualyGroups: data.qualyGroups,
    teamsCount: data.teamsCount,
    raceCount: data.raceCount,
    racesCount: data.raceCount,
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
  await ensureEventsTable();
  try {
    await sql`DELETE FROM events WHERE id = ${id};`;
  } catch {
    throw new Error('No se pudo eliminar el evento.');
  }
}

export async function updateEventConfigPatch(id: string, patch: EventRuntimeConfigPatch): Promise<void> {
  await ensureEventsTable();

  const current = await getEventById(id);
  if (!current) {
    throw new Error('Evento no encontrado.');
  }

  const currentConfig = (current.config ?? {}) as Record<string, unknown>;
  const nextConfig = { ...currentConfig };

  const applyPositive = (key: keyof EventRuntimeConfigPatch) => {
    const value = patch[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      return;
    }

    nextConfig[key] = Math.floor(value);
  };

  applyPositive('maxPilots');
  applyPositive('sessionMaxCapacity');
  applyPositive('timeAttackSessions');
  applyPositive('qualyGroups');
  applyPositive('teamsCount');
  applyPositive('raceCount');

  if (typeof nextConfig.raceCount === 'number') {
    nextConfig.racesCount = nextConfig.raceCount;
  }

  try {
    await sql`
      UPDATE events
      SET config = ${JSON.stringify(nextConfig)}::jsonb
      WHERE id = ${id};
    `;
  } catch {
    throw new Error('No se pudo actualizar la configuración del evento.');
  }
}