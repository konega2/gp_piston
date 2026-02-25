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

export type EventRuntimeConfig = {
  maxPilots: number;
  timeAttackSessions: number;
  qualyGroups: number;
  teamsCount: number;
  maxParticipants: number;
  sessionMaxCapacity: number;
};

export const DEFAULT_EVENT_ID = 'gp-test-2026';

const DEFAULT_RUNTIME_CONFIG: EventRuntimeConfig = {
  maxPilots: 80,
  timeAttackSessions: 5,
  qualyGroups: 3,
  teamsCount: 10,
  maxParticipants: 80,
  sessionMaxCapacity: 20
};

export function getStoredActiveEventId() {
  return DEFAULT_EVENT_ID;
}

export function setStoredActiveEventId(_eventId: string) {}

export function getEventRuntimeConfig(_eventId: string): EventRuntimeConfig {
  return DEFAULT_RUNTIME_CONFIG;
}

export function getEventById(_eventId: string): EventRecord | null {
  return null;
}
