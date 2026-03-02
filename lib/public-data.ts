import { sql } from '@/lib/db';
import { getEventModulePayload, type EventModuleKey } from '@/lib/eventState';

type PublicEvent = {
  id: string;
  slug: string | null;
  name: string;
  location: string | null;
  date: string | Date | null;
  status: 'draft' | 'active' | 'closed';
  config: Record<string, unknown> | null;
  createdAt: string | Date;
};

type PublicPilot = {
  id: string;
  loginCode: string | null;
  number: number;
  name: string;
  apellidos: string | null;
  avatarUrl: string | null;
  nivel: 'PRO' | 'AMATEUR' | 'PRINCIPIANTE' | null;
  hasTimeAttack: boolean;
};

type PublicTimeAttackRankingRow = {
  pilotId: string;
  bestTime: number;
  sessionsDisputed: number;
};

type PublicQualyRow = {
  pilotId: string;
  group: string;
  qualyTime: number | null;
};

type PublicResultsSnapshot = {
  race1: unknown;
  race2: unknown;
};

let cachedColumns: Record<string, boolean> = {};

function tableColumnKey(tableName: string, columnName: string) {
  return `${tableName}.${columnName}`.toLowerCase();
}

async function hasColumn(tableName: string, columnName: string) {
  const key = tableColumnKey(tableName, columnName);
  if (typeof cachedColumns[key] === 'boolean') {
    return cachedColumns[key];
  }

  const { rows } = await sql<{ exists_count: number }>`
    SELECT COUNT(*)::int AS exists_count
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = ${tableName}
      AND column_name = ${columnName};
  `;

  const exists = (rows[0]?.exists_count ?? 0) > 0;
  cachedColumns[key] = exists;
  return exists;
}

export async function listPublicEvents() {
  const slugEnabled = await hasColumn('events', 'slug');

  if (slugEnabled) {
    const { rows } = await sql<{
      id: string;
      slug: string | null;
      name: string;
      location: string | null;
      date: string | Date | null;
      status: 'draft' | 'active' | 'closed';
      config: Record<string, unknown> | null;
      created_at: string | Date;
    }>`
      SELECT id, slug, name, location, date, status, config, created_at
      FROM events
      ORDER BY created_at DESC;
    `;

    return rows.map(toPublicEvent);
  }

  const { rows } = await sql<{
    id: string;
    name: string;
    location: string | null;
    date: string | Date | null;
    status: 'draft' | 'active' | 'closed';
    config: Record<string, unknown> | null;
    created_at: string | Date;
  }>`
    SELECT id, name, location, date, status, config, created_at
    FROM events
    ORDER BY created_at DESC;
  `;

  return rows.map((row) =>
    toPublicEvent({
      ...row,
      slug: null
    })
  );
}

export async function getPublicEventByIdentifier(identifier: string) {
  const slugEnabled = await hasColumn('events', 'slug');

  if (slugEnabled) {
    const { rows } = await sql<{
      id: string;
      slug: string | null;
      name: string;
      location: string | null;
      date: string | Date | null;
      status: 'draft' | 'active' | 'closed';
      config: Record<string, unknown> | null;
      created_at: string | Date;
    }>`
      SELECT id, slug, name, location, date, status, config, created_at
      FROM events
      WHERE id = ${identifier} OR slug = ${identifier}
      LIMIT 1;
    `;

    return rows[0] ? toPublicEvent(rows[0]) : null;
  }

  const { rows } = await sql<{
    id: string;
    name: string;
    location: string | null;
    date: string | Date | null;
    status: 'draft' | 'active' | 'closed';
    config: Record<string, unknown> | null;
    created_at: string | Date;
  }>`
    SELECT id, name, location, date, status, config, created_at
    FROM events
    WHERE id = ${identifier}
    LIMIT 1;
  `;

  if (!rows[0]) {
    return null;
  }

  return toPublicEvent({
    ...rows[0],
    slug: null
  });
}

export async function getPublicPilots(eventId: string): Promise<PublicPilot[]> {
  const avatarEnabled = await hasColumn('pilots', 'avatar_url');

  if (avatarEnabled) {
    const { rows } = await sql<{
      id: string;
      login_code: string | null;
      number: number;
      name: string;
      apellidos: string | null;
      avatar_url: string | null;
      nivel: 'PRO' | 'AMATEUR' | 'PRINCIPIANTE' | null;
      has_time_attack: boolean;
    }>`
      SELECT id, login_code, number, name, apellidos, avatar_url, nivel, has_time_attack
      FROM pilots
      WHERE event_id = ${eventId}
      ORDER BY number ASC;
    `;

    if (rows.length > 0) {
      return rows.map((row) => ({
        id: row.id,
        loginCode: row.login_code,
        number: row.number,
        name: row.name,
        apellidos: row.apellidos,
        avatarUrl: row.avatar_url,
        nivel: row.nivel,
        hasTimeAttack: row.has_time_attack
      }));
    }
  } else {
    const { rows } = await sql<{
      id: string;
      login_code: string | null;
      number: number;
      name: string;
      apellidos: string | null;
      nivel: 'PRO' | 'AMATEUR' | 'PRINCIPIANTE' | null;
      has_time_attack: boolean;
    }>`
      SELECT id, login_code, number, name, apellidos, nivel, has_time_attack
      FROM pilots
      WHERE event_id = ${eventId}
      ORDER BY number ASC;
    `;

    if (rows.length > 0) {
      return rows.map((row) => ({
        id: row.id,
        loginCode: row.login_code,
        number: row.number,
        name: row.name,
        apellidos: row.apellidos,
        avatarUrl: null,
        nivel: row.nivel,
        hasTimeAttack: row.has_time_attack
      }));
    }
  }

  const modulePilots = await getEventModulePayload(eventId, 'pilots');
  if (!Array.isArray(modulePilots)) {
    return [];
  }

  return modulePilots
    .filter((pilot) => Boolean(pilot) && typeof pilot === 'object')
    .map((pilot) => {
      const safe = pilot as Record<string, unknown>;
      return {
        id: asString(safe.id) ?? '',
        loginCode: asString(safe.loginCode),
        number: asNumber(safe.numeroPiloto) ?? 0,
        name: asString(safe.nombre) ?? '',
        apellidos: asString(safe.apellidos),
        avatarUrl: asString(safe.avatarUrl) ?? asString(safe.foto),
        nivel: asNivel(safe.nivel),
        hasTimeAttack: Boolean(safe.hasTimeAttack)
      } satisfies PublicPilot;
    })
    .filter((pilot) => pilot.id.length > 0)
    .sort((a, b) => a.number - b.number);
}

export async function getPublicTimeAttackRanking(eventId: string): Promise<PublicTimeAttackRankingRow[]> {
  const timeAttack = await getEventModulePayload(eventId, 'timeAttack');
  if (!Array.isArray(timeAttack)) {
    return [];
  }

  const byPilot = new Map<string, { best: number; sessions: Set<string> }>();

  timeAttack.forEach((session) => {
    if (!session || typeof session !== 'object') {
      return;
    }

    const safeSession = session as Record<string, unknown>;
    const sessionId = asString(safeSession.id) ?? asString(safeSession.name) ?? 'session';
    const times = Array.isArray(safeSession.times) ? safeSession.times : [];

    times.forEach((entry) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }

      const safeEntry = entry as Record<string, unknown>;
      const pilotId = asString(safeEntry.pilotId);
      const corrected = asNumber(safeEntry.correctedTime) ?? asNumber(safeEntry.rawTime);
      if (!pilotId || typeof corrected !== 'number' || !Number.isFinite(corrected) || corrected <= 0) {
        return;
      }

      const current = byPilot.get(pilotId);
      if (!current) {
        byPilot.set(pilotId, { best: corrected, sessions: new Set([sessionId]) });
        return;
      }

      current.best = Math.min(current.best, corrected);
      current.sessions.add(sessionId);
      byPilot.set(pilotId, current);
    });
  });

  return Array.from(byPilot.entries())
    .map(([pilotId, value]) => ({
      pilotId,
      bestTime: Math.round(value.best * 1000) / 1000,
      sessionsDisputed: value.sessions.size
    }))
    .sort((a, b) => a.bestTime - b.bestTime);
}

export async function getPublicQualyRecords(eventId: string): Promise<PublicQualyRow[]> {
  const qualy = await getEventModulePayload(eventId, 'qualy');
  if (!Array.isArray(qualy)) {
    return [];
  }

  const rows: PublicQualyRow[] = [];

  qualy.forEach((session) => {
    if (!session || typeof session !== 'object') {
      return;
    }

    const safeSession = session as Record<string, unknown>;
    const group = asString(safeSession.groupName) ?? 'Grupo';
    const assigned = Array.isArray(safeSession.assignedPilots) ? safeSession.assignedPilots : [];
    const times = Array.isArray(safeSession.times) ? safeSession.times : [];
    const timeByPilot = new Map<string, number>();

    times.forEach((entry) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }

      const safeEntry = entry as Record<string, unknown>;
      const pilotId = asString(safeEntry.pilotId);
      const qualyTime = asNumber(safeEntry.qualyTime);
      if (!pilotId || typeof qualyTime !== 'number' || qualyTime <= 0) {
        return;
      }

      const prev = timeByPilot.get(pilotId);
      if (typeof prev !== 'number' || qualyTime < prev) {
        timeByPilot.set(pilotId, qualyTime);
      }
    });

    assigned.forEach((pilotIdValue) => {
      const pilotId = asString(pilotIdValue);
      if (!pilotId) {
        return;
      }

      rows.push({
        pilotId,
        group,
        qualyTime: timeByPilot.get(pilotId) ?? null
      });
    });
  });

  return rows;
}

export async function getPublicResultsSnapshot(eventId: string): Promise<PublicResultsSnapshot | null> {
  const results = await getEventModulePayload(eventId, 'results');
  if (!results || typeof results !== 'object') {
    return null;
  }

  const safe = results as Record<string, unknown>;
  return {
    race1: safe.race1 ?? null,
    race2: safe.race2 ?? null
  };
}

export async function getPublicModulePayload<T = unknown>(eventId: string, moduleKey: EventModuleKey): Promise<T | null> {
  const payload = await getEventModulePayload(eventId, moduleKey);
  if (payload === null || typeof payload === 'undefined') {
    return null;
  }

  return payload as T;
}

function toPublicEvent(row: {
  id: string;
  slug?: string | null;
  name: string;
  location: string | null;
  date: string | Date | null;
  status: 'draft' | 'active' | 'closed';
  config: Record<string, unknown> | null;
  created_at: string | Date;
}): PublicEvent {
  return {
    id: row.id,
    slug: row.slug ?? null,
    name: row.name,
    location: row.location,
    date: row.date,
    status: row.status,
    config: row.config,
    createdAt: row.created_at
  };
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asNivel(value: unknown): PublicPilot['nivel'] {
  return value === 'PRO' || value === 'AMATEUR' || value === 'PRINCIPIANTE' ? value : null;
}
