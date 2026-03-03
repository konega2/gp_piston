'use server';

import { revalidatePath } from 'next/cache';
import {
  deleteEventModulePayload,
  getEventModulePayload,
  saveEventModulePayload,
  type EventModuleKey
} from '@/lib/eventState';
import {
  createPilot,
  deletePilot,
  getPilotsByEvent,
  updatePilot,
  type PilotInput
} from '@/lib/pilots';
import {
  createResult,
  deleteResult,
  getResultsByEvent,
  getResultsByRace,
  getResultsSnapshotEntriesByEvent,
  replaceResultsByEvent,
  updateResult,
  type RaceResultInput
} from '@/lib/results';
import {
  createQualySession,
  createTimeAttackSession,
  deleteQualySession,
  deleteTimeAttackSession,
  getQualySessionsByEvent,
  getTimeAttackSessionsByEvent,
  updateQualySession,
  updateTimeAttackSession,
  type QualySessionDB,
  type TimeAttackSessionDB
} from '@/lib/sessions';
import { getTeamsByEvent, replaceTeamsByEvent, type TeamSnapshot } from '@/lib/teams';
import { getEventById, updateEventConfigPatch, type EventRuntimeConfigPatch } from '@/lib/events';
import { computeFullEvent } from '@/lib/domain/event.pipeline';

type EventRuntimeConfig = {
  maxPilots: number;
  sessionMaxCapacity: number;
  timeAttackSessions: number;
  qualyGroups: number;
  teamsCount: number;
  raceCount: number;
};

type EventRuntimeConfigInput = Partial<{
  maxPilots: number;
  sessionMaxCapacity: number;
  timeAttackSessions: number;
  qualyGroups: number;
  teamsCount: number;
  raceCount: number;
}>;

function toPositiveInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.floor(value);
}

function parseRuntimeConfig(config: unknown): EventRuntimeConfig | null {
  if (!config || typeof config !== 'object') {
    return null;
  }

  const safe = config as {
    maxPilots?: number;
    maxParticipants?: number;
    sessionMaxCapacity?: number;
    timeAttackSessions?: number;
    qualyGroups?: number;
    teamsCount?: number;
    raceCount?: number;
    racesCount?: number;
  };

  const maxPilots = toPositiveInt(safe.maxPilots ?? safe.maxParticipants);
  const timeAttackSessions = toPositiveInt(safe.timeAttackSessions);
  const qualyGroups = toPositiveInt(safe.qualyGroups);
  const teamsCount = toPositiveInt(safe.teamsCount);
  const raceCount = toPositiveInt(safe.raceCount ?? safe.racesCount);

  if (!maxPilots || !timeAttackSessions || !qualyGroups || !teamsCount || !raceCount) {
    return null;
  }

  const sessionMaxCapacity = toPositiveInt(safe.sessionMaxCapacity) ?? maxPilots;

  return {
    maxPilots,
    sessionMaxCapacity,
    timeAttackSessions,
    qualyGroups,
    teamsCount,
    raceCount
  };
}

const revalidateEventPaths = (eventId: string) => {
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath('/admin/events');
};

export async function getEventModuleStateAction(eventId: string, moduleKey: EventModuleKey) {
  try {
    return await getEventModulePayload(eventId, moduleKey);
  } catch {
    return null;
  }
}

export async function getEventInfoAction(eventId: string) {
  try {
    const event = await getEventById(eventId);
    if (!event) {
      return {
        exists: false,
        name: null,
        location: null,
        date: null,
        config: null
      };
    }

    return {
      exists: true,
      name: event.name,
      location: event.location,
      date: event.date,
      config: parseRuntimeConfig(event.config)
    };
  } catch {
    return {
      exists: false,
      name: null,
      location: null,
      date: null,
      config: null
    };
  }
}

export async function updateEventRuntimeConfigAction(eventId: string, patch: EventRuntimeConfigInput) {
  try {
    const sanitized: EventRuntimeConfigPatch = {};

    const apply = (key: keyof EventRuntimeConfigInput) => {
      const value = patch[key];
      const parsed = toPositiveInt(value);
      if (!parsed) {
        return;
      }

      sanitized[key] = parsed;
    };

    apply('maxPilots');
    apply('sessionMaxCapacity');
    apply('timeAttackSessions');
    apply('qualyGroups');
    apply('teamsCount');
    apply('raceCount');

    await updateEventConfigPatch(eventId, sanitized);
    revalidateEventPaths(eventId);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'No se pudo actualizar la configuración del evento.' };
  }
}

export async function saveEventModuleStateAction(eventId: string, moduleKey: EventModuleKey, payload: unknown) {
  try {
    await saveEventModulePayload(eventId, moduleKey, payload);
    revalidateEventPaths(eventId);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'No se pudo guardar el estado.' };
  }
}

export async function deleteEventModuleStateAction(eventId: string, moduleKey: EventModuleKey) {
  try {
    await deleteEventModulePayload(eventId, moduleKey);
    revalidateEventPaths(eventId);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'No se pudo borrar el estado.' };
  }
}

export async function getPilotsByEventAction(eventId: string) {
  try {
    return await getPilotsByEvent(eventId);
  } catch {
    return [];
  }
}

export async function createPilotAction(eventId: string, data: PilotInput) {
  try {
    const id = await createPilot(eventId, data);
    revalidateEventPaths(eventId);
    return { ok: true as const, id };
  } catch {
    return { ok: false as const, error: 'No se pudo crear el piloto.' };
  }
}

export async function updatePilotAction(eventId: string, pilotId: string, data: PilotInput) {
  try {
    await updatePilot(eventId, pilotId, data);
    revalidateEventPaths(eventId);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'No se pudo actualizar el piloto.' };
  }
}

export async function deletePilotAction(eventId: string, pilotId: string) {
  try {
    await deletePilot(eventId, pilotId);
    revalidateEventPaths(eventId);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'No se pudo eliminar el piloto.' };
  }
}

export async function getResultsByEventAction(eventId: string) {
  try {
    return await getResultsByEvent(eventId);
  } catch {
    return [];
  }
}

export async function getResultsByRaceAction(eventId: string, raceNumber: number) {
  try {
    return await getResultsByRace(eventId, raceNumber);
  } catch {
    return [];
  }
}

export async function createResultAction(eventId: string, data: RaceResultInput) {
  try {
    const id = await createResult(eventId, data);
    revalidateEventPaths(eventId);
    return { ok: true as const, id };
  } catch {
    return { ok: false as const, error: 'No se pudo crear el resultado.' };
  }
}

export async function updateResultAction(eventId: string, resultId: string, data: RaceResultInput) {
  try {
    await updateResult(eventId, resultId, data);
    revalidateEventPaths(eventId);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'No se pudo actualizar el resultado.' };
  }
}

export async function deleteResultAction(eventId: string, resultId: string) {
  try {
    await deleteResult(eventId, resultId);
    revalidateEventPaths(eventId);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'No se pudo eliminar el resultado.' };
  }
}

export async function getTimeAttackSessionsAction(eventId: string) {
  try {
    return await getTimeAttackSessionsByEvent(eventId);
  } catch {
    return [];
  }
}

export async function getQualySessionsAction(eventId: string) {
  try {
    return await getQualySessionsByEvent(eventId);
  } catch {
    return [];
  }
}

export async function createTimeAttackSessionAction(
  eventId: string,
  data: Omit<TimeAttackSessionDB, 'id' | 'event_id' | 'created_at'>
) {
  try {
    const id = await createTimeAttackSession(eventId, data);
    revalidateEventPaths(eventId);
    return { ok: true as const, id };
  } catch {
    return { ok: false as const, error: 'No se pudo crear la sesión de Time Attack.' };
  }
}

export async function updateTimeAttackSessionAction(
  eventId: string,
  sessionId: string,
  data: Partial<Omit<TimeAttackSessionDB, 'id' | 'event_id' | 'created_at'>>
) {
  try {
    await updateTimeAttackSession(eventId, sessionId, data);
    revalidateEventPaths(eventId);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'No se pudo actualizar la sesión de Time Attack.' };
  }
}

export async function deleteTimeAttackSessionAction(eventId: string, sessionId: string) {
  try {
    await deleteTimeAttackSession(eventId, sessionId);
    revalidateEventPaths(eventId);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'No se pudo eliminar la sesión de Time Attack.' };
  }
}

export async function createQualySessionAction(eventId: string, data: Omit<QualySessionDB, 'id' | 'event_id' | 'created_at'>) {
  try {
    const id = await createQualySession(eventId, data);
    revalidateEventPaths(eventId);
    return { ok: true as const, id };
  } catch {
    return { ok: false as const, error: 'No se pudo crear la sesión de qualy.' };
  }
}

export async function updateQualySessionAction(
  eventId: string,
  sessionId: string,
  data: Partial<Omit<QualySessionDB, 'id' | 'event_id' | 'created_at'>>
) {
  try {
    await updateQualySession(eventId, sessionId, data);
    revalidateEventPaths(eventId);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'No se pudo actualizar la sesión de qualy.' };
  }
}

export async function deleteQualySessionAction(eventId: string, sessionId: string) {
  try {
    await deleteQualySession(eventId, sessionId);
    revalidateEventPaths(eventId);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'No se pudo eliminar la sesión de qualy.' };
  }
}

export async function getTeamsByEventAction(eventId: string) {
  try {
    return await getTeamsByEvent(eventId);
  } catch {
    return [];
  }
}

export async function replaceTeamsByEventAction(eventId: string, teams: TeamSnapshot[]) {
  try {
    await replaceTeamsByEvent(eventId, teams);
    revalidateEventPaths(eventId);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'No se pudieron guardar los equipos.' };
  }
}

type ResultSnapshotPayload = {
  race1: {
    entries: Array<{
      pilotId: string;
      finalPosition: number;
      basePoints: number;
      collectiveBonus: number;
      individualBonus: number;
      finalPoints: number;
    }>;
  };
  race2: {
    entries: Array<{
      pilotId: string;
      finalPosition: number;
      basePoints: number;
      collectiveBonus: number;
      individualBonus: number;
      finalPoints: number;
    }>;
  };
};

export async function getResultsSnapshotByEventAction(eventId: string) {
  try {
    const rows = await getResultsSnapshotEntriesByEvent(eventId);

    const race1Entries = rows.filter((row) => row.race === 'race1');
    const race2Entries = rows.filter((row) => row.race === 'race2');

    const toSummary = (entries: typeof race1Entries) => {
      const ordered = [...entries].sort((a, b) => a.finalPosition - b.finalPosition);
      const winner = ordered[0] ?? null;
      const winningCategory = winner?.category ?? null;
      const oppositeCategory =
        winningCategory === '390cc' ? '270cc' : winningCategory === '270cc' ? '390cc' : null;
      const oppositeLeader = oppositeCategory
        ? ordered.find((entry) => entry.category === oppositeCategory) ?? null
        : null;

      return {
        entries,
        generalWinnerPilotId: winner?.pilotId ?? null,
        winningCategory,
        oppositeCategoryFirstPilotId: oppositeLeader?.pilotId ?? null,
        calculatedAt: null as string | null
      };
    };

    return {
      race1: toSummary(race1Entries),
      race2: toSummary(race2Entries)
    };
  } catch {
    return {
      race1: {
        entries: [],
        generalWinnerPilotId: null,
        winningCategory: null,
        oppositeCategoryFirstPilotId: null,
        calculatedAt: null
      },
      race2: {
        entries: [],
        generalWinnerPilotId: null,
        winningCategory: null,
        oppositeCategoryFirstPilotId: null,
        calculatedAt: null
      }
    };
  }
}

export async function replaceResultsSnapshotByEventAction(eventId: string, payload: ResultSnapshotPayload) {
  try {
    const normalized = [
      ...(Array.isArray(payload.race1?.entries)
        ? payload.race1.entries.map((entry) => ({ raceNumber: 1, ...entry }))
        : []),
      ...(Array.isArray(payload.race2?.entries)
        ? payload.race2.entries.map((entry) => ({ raceNumber: 2, ...entry }))
        : [])
    ]
      .filter(
        (entry) =>
          typeof entry.pilotId === 'string' &&
          Number.isFinite(entry.finalPosition) &&
          Number.isFinite(entry.basePoints) &&
          Number.isFinite(entry.collectiveBonus) &&
          Number.isFinite(entry.individualBonus) &&
          Number.isFinite(entry.finalPoints)
      )
      .map((entry) => ({
        raceNumber: Math.floor(entry.raceNumber),
        pilotId: entry.pilotId,
        finalPosition: Math.floor(entry.finalPosition),
        pointsBase: Math.floor(entry.basePoints),
        bonusCollective: Math.floor(entry.collectiveBonus),
        bonusIndividual: Math.floor(entry.individualBonus),
        totalPoints: Math.floor(entry.finalPoints)
      }));

    await replaceResultsByEvent(eventId, normalized);
    revalidateEventPaths(eventId);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'No se pudieron guardar los resultados.' };
  }
}

export async function computeFullEventAction(eventId: string) {
  try {
    return await computeFullEvent(eventId);
  } catch {
    return {
      eventId,
      seed: 0,
      sources: {
        pilots: 0,
        sessions: 0,
        qualyRecords: 0,
        teams: 0,
        results: 0
      },
      standings: {
        combined: [],
        timeAttack: [],
        individual: [],
        teams: []
      },
      snapshots: {
        races: null,
        results: {
          race1: {
            entries: [],
            generalWinnerPilotId: null,
            winningCategory: null,
            oppositeCategoryFirstPilotId: null,
            calculatedAt: null
          },
          race2: {
            entries: [],
            generalWinnerPilotId: null,
            winningCategory: null,
            oppositeCategoryFirstPilotId: null,
            calculatedAt: null
          }
        }
      }
    };
  }
}
