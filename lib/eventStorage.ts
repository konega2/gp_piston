import {
  EMPTY_RACE_RESULT,
  buildRaceRows,
  buildIndividualStandings,
  buildTeamStandings,
  computeRaceResults,
  type RaceGrid,
  type RacePilot,
  type TeamRecord
} from '@/lib/resultsEngine';
import { createDefaultTimeAttackSessions } from '@/data/timeAttackSessions';
import type { TimeAttackSession } from '@/data/timeAttackSessions';
import type { PilotRecord } from '@/data/pilots';

export type EventRecord = {
  id: string;
  name: string;
  location: string;
  date: string;
  status: 'activo' | 'borrador' | 'cerrado';
  createdAt: number;
  maxParticipants?: number;
  teamsCount?: number;
  timeAttackSessions?: number;
  sessionMaxCapacity?: number;
  qualyGroups?: number;
  raceCount?: number;
};

export type EventModuleConfig = {
  maxPilots: number;
  timeAttackSessions: number;
  qualyGroups: number;
  teamsCount: number;
};

type QualySession = {
  id: string;
  name: string;
  groupName: string;
  startTime: string;
  duration: number;
  assignedPilots: string[];
  status: 'pending' | 'completed';
  times: Array<{ pilotId: string; qualyTime: number }>;
};

type RaffleRecord = {
  id: string;
  title: string;
  description: string;
  type: 'custom';
  rules: {
    onlyConfirmed: boolean;
    excludeDisqualified: boolean;
    excludePreviousWinners: boolean;
    only270: boolean;
    only390: boolean;
    onlyTimeAttack: boolean;
  };
  allowDuplicates: boolean;
  winner: null | {
    id: string;
    name: string;
    number: string;
  };
  participantsSnapshot: Array<{
    id: string;
    name: string;
    number: string;
  }>;
  createdAt: number;
};

type RaffleHistoryEntry = {
  raffleId: string;
  raffleTitle: string;
  winnerId: string;
  winnerName: string;
  date: number;
};

type EventNamespaceData = {
  config: EventModuleConfig;
  pilots: PilotRecord[];
  timeAttack: {
    sessions: TimeAttackSession[];
    times: Array<{ pilotId: string; rawTime: number; correctedTime: number }>;
  };
  qualy: QualySession[];
  raffles: RaffleRecord[];
  rafflesHistory: RaffleHistoryEntry[];
  teams: TeamRecord[];
  race1: RaceGrid | [];
  race2: RaceGrid | [];
  results: {
    standings: Array<unknown>;
    teamRanking: Array<unknown>;
    raceResults?: {
      race1: typeof EMPTY_RACE_RESULT;
      race2: typeof EMPTY_RACE_RESULT;
    };
  };
};

type StoredRaces = {
  race1: RaceGrid | null;
  race2: RaceGrid | null;
};

const DEFAULT_EVENT_CONFIG: EventModuleConfig = {
  maxPilots: 20,
  timeAttackSessions: 5,
  qualyGroups: 3,
  teamsCount: 5
};

export const EVENTS_STORAGE_KEY = 'events';
export const DEFAULT_EVENT_ID = 'gp-test-2026';
export const TEST_EVENT: EventRecord = {
  id: 'gp-test-2026',
  name: 'GP Pistón Test 2026',
  location: 'Valencia',
  date: '2026-03-21',
  status: 'activo',
  maxParticipants: 20,
  teamsCount: 5,
  timeAttackSessions: 5,
  sessionMaxCapacity: 20,
  qualyGroups: 3,
  raceCount: 2,
  createdAt: Date.UTC(2026, 1, 24)
};

const KEY_ALIASES = {
  pilots: ['pilots', 'gp-piston-pilots'],
  timeAttack: ['timeAttack', 'gp-piston-time-attack-sessions'],
  qualy: ['qualy', 'gp-piston-classification-sessions', 'gp-piston-classification-qualy'],
  raffles: ['raffles', 'gp-piston-raffles'],
  rafflesHistory: ['rafflesHistory', 'gp-piston-raffles-history'],
  teams: ['teams', 'gp-piston-teams'],
  races: ['races', 'gp-piston-races-grids'],
  results: ['results', 'gp-piston-results']
} as const;

const LEGACY_GLOBAL_KEYS = new Set([
  'pilots',
  'teams',
  'races',
  'results',
  'qualy',
  'raffles',
  'rafflesHistory',
  'timeAttack',
  'gp-piston-events',
  'gp-piston-active-event-id',
  'gp-piston-pilots',
  'gp-piston-time-attack-sessions',
  'gp-piston-classification-sessions',
  'gp-piston-classification-qualy',
  'gp-piston-raffles',
  'gp-piston-raffles-history',
  'gp-piston-teams',
  'gp-piston-races-grids',
  'gp-piston-results'
]);

export function getStoredActiveEventId() {
  return DEFAULT_EVENT_ID;
}

export function setStoredActiveEventId(_eventId: string) {}

export function getEventStorageKey(_baseKey: string, eventId: string) {
  return getEventNamespaceKey(eventId);
}

export function loadEventStorageItem(baseKey: string, eventId: string) {
  if (typeof window === 'undefined') {
    return null;
  }

  const namespace = ensureEventNamespace(eventId);
  const normalized = normalizeBaseKey(baseKey);

  if (normalized === 'pilots') {
    return JSON.stringify(namespace.pilots);
  }

  if (normalized === 'timeAttack') {
    return JSON.stringify(namespace.timeAttack.sessions);
  }

  if (normalized === 'qualy') {
    return JSON.stringify(namespace.qualy);
  }

  if (normalized === 'raffles') {
    return JSON.stringify(namespace.raffles);
  }

  if (normalized === 'rafflesHistory') {
    return JSON.stringify(namespace.rafflesHistory);
  }

  if (normalized === 'teams') {
    return JSON.stringify(namespace.teams);
  }

  if (normalized === 'races') {
    return JSON.stringify({
      race1: isRaceGrid(namespace.race1) ? namespace.race1 : null,
      race2: isRaceGrid(namespace.race2) ? namespace.race2 : null
    } satisfies StoredRaces);
  }

  if (normalized === 'results') {
    return JSON.stringify(
      namespace.results.raceResults ?? {
        race1: { ...EMPTY_RACE_RESULT },
        race2: { ...EMPTY_RACE_RESULT }
      }
    );
  }

  return null;
}

export function saveEventStorageItem(baseKey: string, eventId: string, value: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const namespace = ensureEventNamespace(eventId);
  const normalized = normalizeBaseKey(baseKey);

  try {
    const parsed = JSON.parse(value) as unknown;

    if (normalized === 'pilots') {
      namespace.pilots = Array.isArray(parsed) ? (parsed as PilotRecord[]) : namespace.pilots;
    }

    if (normalized === 'timeAttack') {
      namespace.timeAttack.sessions = Array.isArray(parsed) ? (parsed as TimeAttackSession[]) : namespace.timeAttack.sessions;
      namespace.timeAttack.times = namespace.timeAttack.sessions.flatMap((session) => session.times ?? []);
    }

    if (normalized === 'qualy') {
      namespace.qualy = Array.isArray(parsed) ? (parsed as QualySession[]) : namespace.qualy;
    }

    if (normalized === 'raffles') {
      namespace.raffles = Array.isArray(parsed) ? (parsed as RaffleRecord[]) : namespace.raffles;
    }

    if (normalized === 'rafflesHistory') {
      namespace.rafflesHistory = Array.isArray(parsed) ? (parsed as RaffleHistoryEntry[]) : namespace.rafflesHistory;
    }

    if (normalized === 'teams') {
      namespace.teams = Array.isArray(parsed) ? (parsed as TeamRecord[]) : namespace.teams;
    }

    if (normalized === 'races') {
      const races = parsed as Partial<StoredRaces>;
      namespace.race1 = isRaceGrid(races?.race1) ? races.race1 : [];
      namespace.race2 = isRaceGrid(races?.race2) ? races.race2 : [];
    }

    if (normalized === 'results') {
      const safeResults = parsed as { race1?: typeof EMPTY_RACE_RESULT; race2?: typeof EMPTY_RACE_RESULT };
      namespace.results.raceResults = {
        race1: safeResults?.race1 ? safeResults.race1 : { ...EMPTY_RACE_RESULT },
        race2: safeResults?.race2 ? safeResults.race2 : { ...EMPTY_RACE_RESULT }
      };
      namespace.results.standings = [];
      namespace.results.teamRanking = [];
    }
  } catch {
    return;
  }

  saveNamespace(eventId, namespace);
}

export function loadEvents() {
  if (typeof window === 'undefined') {
    return [] as EventRecord[];
  }

  try {
    const raw = window.localStorage.getItem(EVENTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (item): item is EventRecord =>
          Boolean(item) &&
          typeof (item as EventRecord).id === 'string' &&
          typeof (item as EventRecord).name === 'string' &&
          typeof (item as EventRecord).location === 'string' &&
          typeof (item as EventRecord).date === 'string' &&
          typeof (item as EventRecord).status === 'string' &&
          typeof (item as EventRecord).createdAt === 'number'
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function saveEvents(events: EventRecord[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
}

export function getEventById(eventId: string) {
  return loadEvents().find((event) => event.id === eventId) ?? null;
}

export function updateEvent(updatedEvent: EventRecord) {
  const current = loadEvents();
  const next = current.map((event) => (event.id === updatedEvent.id ? updatedEvent : event));
  saveEvents(next);
  syncEventNamespaceConfig(updatedEvent.id, toModuleConfig(updatedEvent));
}

export function deleteEvent(eventId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const remaining = loadEvents().filter((event) => event.id !== eventId);
  saveEvents(remaining);
  window.localStorage.removeItem(getEventNamespaceKey(eventId));
}

export function getEventRuntimeConfig(eventId: string) {
  const namespace = readNamespace(eventId);
  const event = getEventById(eventId);

  const fromEvent = toModuleConfig(event ?? null);
  const resolved = namespace?.config
    ? {
        maxPilots: sanitizePositiveNumber(namespace.config.maxPilots, fromEvent.maxPilots),
        timeAttackSessions: sanitizePositiveNumber(namespace.config.timeAttackSessions, fromEvent.timeAttackSessions),
        qualyGroups: sanitizePositiveNumber(namespace.config.qualyGroups, fromEvent.qualyGroups),
        teamsCount: sanitizePositiveNumber(namespace.config.teamsCount, fromEvent.teamsCount)
      }
    : fromEvent;

  return {
    ...resolved,
    maxParticipants: resolved.maxPilots,
    sessionMaxCapacity: resolved.maxPilots
  };
}

export function initializeEventNamespace(eventId: string, config?: EventModuleConfig) {
  if (typeof window === 'undefined') {
    return;
  }

  const current = readNamespace(eventId);
  if (current) {
    return;
  }

  const nextConfig = config ?? toModuleConfig(getEventById(eventId));
  saveNamespace(eventId, createEmptyNamespace(nextConfig));
}

export function syncEventNamespaceConfig(eventId: string, config?: EventModuleConfig) {
  if (typeof window === 'undefined') {
    return;
  }

  const namespace = ensureEventNamespace(eventId);
  const nextConfig = config ?? toModuleConfig(getEventById(eventId));
  namespace.config = {
    maxPilots: sanitizePositiveNumber(nextConfig.maxPilots, DEFAULT_EVENT_CONFIG.maxPilots),
    timeAttackSessions: sanitizePositiveNumber(nextConfig.timeAttackSessions, DEFAULT_EVENT_CONFIG.timeAttackSessions),
    qualyGroups: sanitizePositiveNumber(nextConfig.qualyGroups, DEFAULT_EVENT_CONFIG.qualyGroups),
    teamsCount: sanitizePositiveNumber(nextConfig.teamsCount, DEFAULT_EVENT_CONFIG.teamsCount)
  };
  saveNamespace(eventId, namespace);
}

export function hardResetStorageToTestEventIfNeeded() {
  if (typeof window === 'undefined') {
    return { reset: false, eventId: DEFAULT_EVENT_ID };
  }

  const localKeys = Object.keys(window.localStorage);
  const hasLegacy = localKeys.some((key) => LEGACY_GLOBAL_KEYS.has(key) || key.startsWith('gp-piston-') || key.includes('::'));

  const events = loadEvents();
  const hasTestEvent = events.some((event) => event.id === TEST_EVENT.id);
  const hasTestNamespace = Boolean(window.localStorage.getItem(getEventNamespaceKey(TEST_EVENT.id)));
  const testNamespace = hasTestNamespace ? readNamespace(TEST_EVENT.id) : null;
  const hasLegacyMockPilotsInTestEvent = isLegacyMockPilots(testNamespace?.pilots ?? []);

  if (!hasLegacy && hasTestEvent && hasTestNamespace && !hasLegacyMockPilotsInTestEvent) {
    return { reset: false, eventId: TEST_EVENT.id };
  }

  localKeys.forEach((key) => {
    if (
      key === EVENTS_STORAGE_KEY ||
      key.startsWith('event_') ||
      LEGACY_GLOBAL_KEYS.has(key) ||
      key.startsWith('gp-piston-') ||
      key.includes('::')
    ) {
      window.localStorage.removeItem(key);
    }
  });

  saveEvents([TEST_EVENT]);
  saveNamespace(TEST_EVENT.id, createEmptyNamespace(toModuleConfig(TEST_EVENT)));

  return { reset: true, eventId: TEST_EVENT.id };
}

export function hydrateTestEventWithChampionshipDataIfNeeded() {
  if (typeof window === 'undefined') {
    return { hydrated: false, eventId: TEST_EVENT.id };
  }

  const events = loadEvents();
  if (!events.some((event) => event.id === TEST_EVENT.id)) {
    saveEvents([TEST_EVENT, ...events]);
  }

  const namespace = ensureEventNamespace(TEST_EVENT.id);
  if (!shouldHydrateTestEvent(namespace)) {
    return { hydrated: false, eventId: TEST_EVENT.id };
  }

  const config = namespace.config;
  const pilots = buildTestPilots(Math.min(24, Math.max(config.maxPilots, 12)));
  const teams = buildTeamsFromPilots(config.teamsCount, pilots);
  const timeAttackSessions = buildTimeAttackSessionsForTest(config.timeAttackSessions, config.maxPilots, pilots);
  const qualySessions = buildQualySessionsForTest(config.qualyGroups, pilots);

  const combinedByPilot = buildCombinedTimesMap(pilots, timeAttackSessions, qualySessions);
  const orderedByCombined = [...pilots]
    .filter((pilot) => combinedByPilot.has(pilot.id))
    .sort((a, b) => {
      const aTime = Number(combinedByPilot.get(a.id) ?? Number.MAX_SAFE_INTEGER);
      const bTime = Number(combinedByPilot.get(b.id) ?? Number.MAX_SAFE_INTEGER);
      if (aTime !== bTime) {
        return aTime - bTime;
      }

      return a.numeroPiloto - b.numeroPiloto;
    });

  const teamByPilotId = new Map<string, string>();
  teams.forEach((team) => {
    team.members.forEach((pilotId) => {
      teamByPilotId.set(pilotId, team.name);
    });
  });

  const race1Grid = buildRaceGridForTest(orderedByCombined, teamByPilotId, 'race1');
  const race2Grid = buildRaceGridForTest(orderedByCombined, teamByPilotId, 'race2');

  const race1Rows = buildRaceRows(race1Grid).map((pilot, index) => ({
    pilot,
    finalPosition: index + 1
  }));

  const race2BaseRows = buildRaceRows(race2Grid);
  const race2Rows = race2BaseRows.map((pilot, index) => ({
    pilot,
    finalPosition: index === 0 ? 2 : index === 1 ? 1 : index + 1
  }));

  const raceResults = {
    race1: computeRaceResults('race1', race1Rows),
    race2: computeRaceResults('race2', race2Rows)
  };

  namespace.pilots = pilots;
  namespace.timeAttack.sessions = timeAttackSessions;
  namespace.timeAttack.times = timeAttackSessions.flatMap((session) => session.times);
  namespace.qualy = qualySessions;
  namespace.teams = teams;
  namespace.race1 = race1Grid;
  namespace.race2 = race2Grid;
  namespace.results = {
    standings: buildIndividualStandings(raceResults),
    teamRanking: buildTeamStandings(raceResults, teams),
    raceResults
  };

  saveNamespace(TEST_EVENT.id, namespace);
  return { hydrated: true, eventId: TEST_EVENT.id };
}

function getEventNamespaceKey(eventId: string) {
  return `event_${eventId}`;
}

function normalizeBaseKey(baseKey: string): keyof typeof KEY_ALIASES | null {
  const entries = Object.entries(KEY_ALIASES) as Array<[keyof typeof KEY_ALIASES, readonly string[]]>;
  const found = entries.find(([, aliases]) => aliases.includes(baseKey));
  return found?.[0] ?? null;
}

function readNamespace(eventId: string) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getEventNamespaceKey(eventId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<EventNamespaceData>;
    return normalizeNamespace(parsed);
  } catch {
    return null;
  }
}

function saveNamespace(eventId: string, namespace: EventNamespaceData) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getEventNamespaceKey(eventId), JSON.stringify(namespace));
}

function ensureEventNamespace(eventId: string) {
  const existing = readNamespace(eventId);
  if (existing) {
    return existing;
  }

  const empty = createEmptyNamespace(toModuleConfig(getEventById(eventId)));
  saveNamespace(eventId, empty);
  return empty;
}

function createEmptyNamespace(config: EventModuleConfig): EventNamespaceData {
  return {
    config: {
      maxPilots: sanitizePositiveNumber(config.maxPilots, DEFAULT_EVENT_CONFIG.maxPilots),
      timeAttackSessions: sanitizePositiveNumber(config.timeAttackSessions, DEFAULT_EVENT_CONFIG.timeAttackSessions),
      qualyGroups: sanitizePositiveNumber(config.qualyGroups, DEFAULT_EVENT_CONFIG.qualyGroups),
      teamsCount: sanitizePositiveNumber(config.teamsCount, DEFAULT_EVENT_CONFIG.teamsCount)
    },
    pilots: [],
    timeAttack: {
      sessions: [],
      times: []
    },
    qualy: [],
    raffles: [],
    rafflesHistory: [],
    teams: [],
    race1: [],
    race2: [],
    results: {
      standings: [],
      teamRanking: []
    }
  };
}

function normalizeNamespace(candidate: Partial<EventNamespaceData>): EventNamespaceData {
  const fallback = createEmptyNamespace(DEFAULT_EVENT_CONFIG);

  return {
    config: {
      maxPilots: sanitizePositiveNumber(candidate.config?.maxPilots, fallback.config.maxPilots),
      timeAttackSessions: sanitizePositiveNumber(candidate.config?.timeAttackSessions, fallback.config.timeAttackSessions),
      qualyGroups: sanitizePositiveNumber(candidate.config?.qualyGroups, fallback.config.qualyGroups),
      teamsCount: sanitizePositiveNumber(candidate.config?.teamsCount, fallback.config.teamsCount)
    },
    pilots: Array.isArray(candidate.pilots) ? candidate.pilots : fallback.pilots,
    timeAttack: {
      sessions: Array.isArray(candidate.timeAttack?.sessions) ? candidate.timeAttack?.sessions : fallback.timeAttack.sessions,
      times: Array.isArray(candidate.timeAttack?.times) ? candidate.timeAttack?.times : fallback.timeAttack.times
    },
    qualy: Array.isArray(candidate.qualy) ? candidate.qualy : fallback.qualy,
    raffles: Array.isArray(candidate.raffles) ? candidate.raffles : fallback.raffles,
    rafflesHistory: Array.isArray(candidate.rafflesHistory) ? candidate.rafflesHistory : fallback.rafflesHistory,
    teams: Array.isArray(candidate.teams) ? candidate.teams : fallback.teams,
    race1: isRaceGrid(candidate.race1) ? candidate.race1 : fallback.race1,
    race2: isRaceGrid(candidate.race2) ? candidate.race2 : fallback.race2,
    results: {
      standings: Array.isArray(candidate.results?.standings) ? candidate.results?.standings : fallback.results.standings,
      teamRanking: Array.isArray(candidate.results?.teamRanking) ? candidate.results?.teamRanking : fallback.results.teamRanking,
      raceResults:
        candidate.results?.raceResults &&
        typeof candidate.results.raceResults === 'object'
          ? candidate.results.raceResults
          : undefined
    }
  };
}

function toModuleConfig(event: EventRecord | null): EventModuleConfig {
  return {
    maxPilots: sanitizePositiveNumber(event?.maxParticipants, DEFAULT_EVENT_CONFIG.maxPilots),
    timeAttackSessions: sanitizePositiveNumber(event?.timeAttackSessions, DEFAULT_EVENT_CONFIG.timeAttackSessions),
    qualyGroups: sanitizePositiveNumber(event?.qualyGroups, DEFAULT_EVENT_CONFIG.qualyGroups),
    teamsCount: sanitizePositiveNumber(event?.teamsCount, DEFAULT_EVENT_CONFIG.teamsCount)
  };
}

function isRaceGrid(value: unknown): value is RaceGrid {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as RaceGrid;
  return isRaceGroupGrid(candidate.group1) && isRaceGroupGrid(candidate.group2);
}

function isRaceGroupGrid(value: unknown): value is { category390: RacePilot[]; category270: RacePilot[] } {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { category390: RacePilot[]; category270: RacePilot[] };
  return Array.isArray(candidate.category390) && Array.isArray(candidate.category270);
}

function sanitizePositiveNumber(value: number | undefined, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.floor(value);
}

function shouldHydrateTestEvent(namespace: EventNamespaceData) {
  const pilotCount = namespace.pilots.length;
  const taTimes = namespace.timeAttack.sessions.reduce((acc, session) => acc + session.times.length, 0);
  const qualyTimes = namespace.qualy.reduce((acc, session) => acc + session.times.length, 0);
  const race1Rows = isRaceGrid(namespace.race1)
    ? namespace.race1.group1.category390.length +
      namespace.race1.group1.category270.length +
      namespace.race1.group2.category390.length +
      namespace.race1.group2.category270.length
    : 0;
  const race2Rows = isRaceGrid(namespace.race2)
    ? namespace.race2.group1.category390.length +
      namespace.race2.group1.category270.length +
      namespace.race2.group2.category390.length +
      namespace.race2.group2.category270.length
    : 0;
  const resultRows = namespace.results.raceResults
    ? namespace.results.raceResults.race1.entries.length + namespace.results.raceResults.race2.entries.length
    : 0;

  return pilotCount <= 1 && taTimes === 0 && qualyTimes === 0 && race1Rows === 0 && race2Rows === 0 && resultRows === 0;
}

function buildTestPilots(total: number): PilotRecord[] {
  const firstNames = [
    'Adrián',
    'Marta',
    'Sergio',
    'Lucía',
    'Carlos',
    'Nerea',
    'Iván',
    'Paula',
    'Álvaro',
    'Claudia',
    'Rubén',
    'Elena'
  ];
  const surnames = ['Lozano', 'Rivas', 'Peña', 'Bermúdez', 'Mendoza', 'Solís', 'Ferrer', 'Crespo', 'Navarro', 'Herrera'];

  return Array.from({ length: total }, (_, index) => {
    const firstName = firstNames[index % firstNames.length] ?? 'Piloto';
    const surnameA = surnames[index % surnames.length] ?? 'Uno';
    const surnameB = surnames[(index * 3 + 2) % surnames.length] ?? 'Dos';
    const level = index % 3 === 0 ? 'PRO' : index % 3 === 1 ? 'AMATEUR' : 'PRINCIPIANTE';

    return {
      id: `test-pilot-${index + 1}`,
      numeroPiloto: index + 1,
      nombre: firstName,
      apellidos: `${surnameA} ${surnameB}`,
      edad: 18 + (index % 16),
      telefono: `+34 6${String(10000000 + index * 147).slice(0, 8)}`,
      redesSociales: `@${firstName.toLowerCase()}.${surnameA.toLowerCase()}${index + 1}`,
      peso: 56 + (index % 18),
      nivel: level,
      hasTimeAttack: index % 6 !== 0,
      kart: index % 2 === 0 ? '390cc' : '270cc',
      comisario: index % 9 === 0,
      foto: null
    };
  });
}

function buildTeamsFromPilots(teamsCount: number, pilots: PilotRecord[]): TeamRecord[] {
  const safeCount = sanitizePositiveNumber(teamsCount, DEFAULT_EVENT_CONFIG.teamsCount);
  const teams = Array.from({ length: safeCount }, (_, index) => ({
    id: `team-${index + 1}`,
    name: `Equipo ${index + 1}`,
    members: [] as string[]
  }));

  pilots.forEach((pilot, index) => {
    const slot = index % safeCount;
    teams[slot]?.members.push(pilot.id);
  });

  return teams;
}

function buildTimeAttackSessionsForTest(sessionsCount: number, maxCapacity: number, pilots: PilotRecord[]) {
  const sessions = createDefaultTimeAttackSessions(maxCapacity, sessionsCount);
  const eligible = pilots.filter((pilot) => pilot.hasTimeAttack);

  eligible.forEach((pilot, index) => {
    const session = sessions[index % sessions.length];
    if (!session) {
      return;
    }

    if (session.assignedPilots.length < session.maxCapacity) {
      session.assignedPilots.push(pilot.id);
    }
  });

  return sessions.map((session, sessionIndex) => {
    const times = session.assignedPilots.map((pilotId) => {
      const pilot = pilots.find((item) => item.id === pilotId);
      const base = pilot?.nivel === 'PRO' ? 49.2 : pilot?.nivel === 'AMATEUR' ? 50.3 : 51.4;
      const rawTime = roundToMillis(base + (pilot?.numeroPiloto ?? 0) * 0.029 + sessionIndex * 0.061 + ((pilot?.numeroPiloto ?? 0) % 5) * 0.008);

      return {
        pilotId,
        rawTime,
        correctedTime: rawTime
      };
    });

    const best = times.reduce<number | null>((current, item) => {
      if (typeof current !== 'number' || item.correctedTime < current) {
        return item.correctedTime;
      }

      return current;
    }, null);

    return {
      ...session,
      status: 'closed' as const,
      referenceTime: best,
      times
    };
  });
}

function buildQualySessionsForTest(groupsCount: number, pilots: PilotRecord[]) {
  const safeGroups = sanitizePositiveNumber(groupsCount, DEFAULT_EVENT_CONFIG.qualyGroups);
  const sessions = Array.from({ length: safeGroups }, (_, index) => ({
    id: `qualy-q${index + 1}`,
    name: `Q${index + 1}`,
    groupName: `Grupo ${index + 1}`,
    startTime: buildClockTime('11:30', index * 10),
    duration: 5,
    assignedPilots: [] as string[],
    status: 'pending' as const,
    times: [] as Array<{ pilotId: string; qualyTime: number }>
  }));

  pilots.forEach((pilot, index) => {
    sessions[index % sessions.length]?.assignedPilots.push(pilot.id);
  });

  return sessions.map((session, sessionIndex) => {
    const times = session.assignedPilots.map((pilotId) => {
      const pilot = pilots.find((item) => item.id === pilotId);
      const base = pilot?.nivel === 'PRO' ? 49.0 : pilot?.nivel === 'AMATEUR' ? 50.1 : 51.2;
      const qualyTime = roundToMillis(base + (pilot?.numeroPiloto ?? 0) * 0.021 + sessionIndex * 0.073 + ((pilot?.numeroPiloto ?? 0) % 4) * 0.007);

      return {
        pilotId,
        qualyTime
      };
    });

    return {
      ...session,
      status: 'completed' as const,
      times
    };
  });
}

function buildCombinedTimesMap(
  pilots: PilotRecord[],
  sessions: Array<{ times: Array<{ pilotId: string; correctedTime: number }> }>,
  qualySessions: Array<{ times: Array<{ pilotId: string; qualyTime: number }> }>
) {
  const bestTa = new Map<string, number>();
  sessions.forEach((session) => {
    session.times.forEach((time) => {
      const current = bestTa.get(time.pilotId);
      if (typeof current !== 'number' || time.correctedTime < current) {
        bestTa.set(time.pilotId, time.correctedTime);
      }
    });
  });

  const bestQualy = new Map<string, number>();
  qualySessions.forEach((session) => {
    session.times.forEach((time) => {
      const current = bestQualy.get(time.pilotId);
      if (typeof current !== 'number' || time.qualyTime < current) {
        bestQualy.set(time.pilotId, time.qualyTime);
      }
    });
  });

  const combined = new Map<string, number>();
  pilots.forEach((pilot) => {
    const ta = bestTa.get(pilot.id);
    const qualy = bestQualy.get(pilot.id);

    if (typeof ta === 'number' && typeof qualy === 'number') {
      combined.set(pilot.id, Math.min(ta, qualy));
      return;
    }

    if (typeof ta === 'number') {
      combined.set(pilot.id, ta);
      return;
    }

    if (typeof qualy === 'number') {
      combined.set(pilot.id, qualy);
    }
  });

  return combined;
}

function buildRaceGridForTest(
  standings: PilotRecord[],
  teamByPilotId: Map<string, string>,
  race: 'race1' | 'race2'
): RaceGrid {
  const pilotById = new Map(standings.map((pilot) => [pilot.id, pilot]));
  const classified = standings.map((pilot, index) => ({
    pilotId: pilot.id,
    numeroPiloto: pilot.numeroPiloto,
    fullName: `${pilot.nombre} ${pilot.apellidos}`,
    classificationPosition: index + 1
  }));

  const mapPilot = (pilot: (typeof classified)[number]): RacePilot => ({
    pilotId: pilot.pilotId,
    numeroPiloto: pilot.numeroPiloto,
    fullName: pilot.fullName,
    teamName: teamByPilotId.get(pilot.pilotId) ?? 'Sin equipo',
    classificationPosition: pilot.classificationPosition
  });

  const total = classified.length;
  const groupSize = Math.ceil(total / 2);
  const group1 = classified.slice(0, groupSize);
  const group2 = classified.slice(groupSize);

  const buildGroupGrid = (group: typeof classified) => {
    return {
      category390: group
        .filter((pilot) => pilot.pilotId && pilotById.get(pilot.pilotId)?.kart === '390cc')
        .sort((a, b) => a.classificationPosition - b.classificationPosition)
        .map(mapPilot),
      category270: group
        .filter((pilot) => pilot.pilotId && pilotById.get(pilot.pilotId)?.kart === '270cc')
        .sort((a, b) => a.classificationPosition - b.classificationPosition)
        .map(mapPilot)
    };
  };

  return {
    group1: buildGroupGrid(group1),
    group2: buildGroupGrid(group2)
  };
}

function buildClockTime(base: string, plusMinutes: number) {
  const [hourPart, minutePart] = base.split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  const total = (Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : 0) + plusMinutes;
  const endHour = Math.floor(total / 60) % 24;
  const endMinute = total % 60;
  return `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
}

function roundToMillis(value: number) {
  return Math.round(value * 1000) / 1000;
}

function isLegacyMockPilots(pilots: PilotRecord[]) {
  if (!Array.isArray(pilots) || pilots.length === 0) {
    return false;
  }

  const legacyLike = pilots.filter((pilot) => /^p-\d+$/.test(pilot.id)).length;
  return legacyLike >= Math.ceil(pilots.length * 0.8);
}
