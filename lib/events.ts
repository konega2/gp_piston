import { sql } from '@/lib/db';
import { ensureUniqueSlug, generateSlug } from '@/lib/slug';

let eventsTableReady: Promise<void> | null = null;
let eventSlugsBackfilled: Promise<void> | null = null;

async function ensureEventsTable() {
  if (!eventsTableReady) {
    eventsTableReady = (async () => {
      await sql`
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
      `;

      await sql`
        ALTER TABLE events
        ADD COLUMN IF NOT EXISTS slug TEXT;
      `;

      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_events_slug
        ON events(slug);
      `;

      if (!eventSlugsBackfilled) {
        eventSlugsBackfilled = backfillMissingEventSlugs();
      }

      await eventSlugsBackfilled;
    })();
  }

  await eventsTableReady;
}

async function backfillMissingEventSlugs() {
  const { rows } = await sql<{ id: string; name: string; slug: string | null }>`
    SELECT id, name, slug
    FROM events
    WHERE slug IS NULL OR BTRIM(slug) = '';
  `;

  for (const row of rows) {
    const base = generateSlug(row.name || row.id);
    const uniqueSlug = await ensureUniqueSlug(base);

    await sql`
      UPDATE events
      SET slug = ${uniqueSlug}
      WHERE id = ${row.id};
    `;
  }

  await sql`
    ALTER TABLE events
    ALTER COLUMN slug SET NOT NULL;
  `;
}

export type EventRow = {
  id: string;
  slug: string;
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
    domainSeed?: number;
  } | null;
  created_at: string | Date;
};

export type EventInput = {
  slug?: string;
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
  domainSeed: number;
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
  const baseSlug = generateSlug(data.name.trim());
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
    let slug = await ensureUniqueSlug(baseSlug);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await sql`
          INSERT INTO events (id, slug, name, location, date, status, config)
          VALUES (${id}, ${slug}, ${data.name.trim()}, ${data.location.trim()}, ${data.date}, ${'active'}, ${JSON.stringify(config)}::jsonb);
        `;

        return id;
      } catch (error) {
        if ((error as any)?.code === '23505') {
          slug = await ensureUniqueSlug(baseSlug);
          continue;
        }

        throw error;
      }
    }
    throw new Error('No se pudo crear el evento.');
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
  applyPositive('domainSeed');

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

function stringHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export async function getOrCreateEventDomainSeed(id: string): Promise<number> {
  await ensureEventsTable();
  const current = await getEventById(id);
  if (!current) {
    throw new Error('Evento no encontrado.');
  }

  const existing = current.config?.domainSeed;
  if (typeof existing === 'number' && Number.isFinite(existing) && existing > 0) {
    return Math.floor(existing);
  }

  const fallbackSeed = Math.max(1, stringHash(id));

  await sql`
    UPDATE events
    SET config = jsonb_set(
      COALESCE(config, '{}'::jsonb),
      '{domainSeed}',
      to_jsonb(${fallbackSeed}::int),
      true
    )
    WHERE id = ${id}
      AND (
        config IS NULL
        OR jsonb_typeof(config->'domainSeed') IS DISTINCT FROM 'number'
        OR COALESCE((config->>'domainSeed')::int, 0) <= 0
      );
  `;

  const refreshed = await getEventById(id);
  const persisted = refreshed?.config?.domainSeed;

  if (typeof persisted === 'number' && Number.isFinite(persisted) && persisted > 0) {
    return Math.floor(persisted);
  }

  return fallbackSeed;
}