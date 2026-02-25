export type TimeAttackSessionName = string;

export type TimeAttackSessionStatus = 'pending' | 'closed';

export type TimeAttackPilotTime = {
  pilotId: string;
  rawTime: number;
  correctedTime: number;
};

export type TimeAttackSession = {
  id: string;
  name: TimeAttackSessionName;
  startTime: string;
  duration: number;
  maxCapacity: number;
  assignedPilots: string[];
  status: TimeAttackSessionStatus;
  referenceTime: number | null;
  times: TimeAttackPilotTime[];
};

export const DEFAULT_SESSION_CAPACITY = 20;
export const DEFAULT_SESSION_DURATION = 10;
export const DEFAULT_SESSION_COUNT = 5;

export function createDefaultTimeAttackSessions(
  maxCapacity = DEFAULT_SESSION_CAPACITY,
  sessionCount = DEFAULT_SESSION_COUNT
): TimeAttackSession[] {
  const safeCount = Number.isFinite(sessionCount) && sessionCount > 0 ? Math.floor(sessionCount) : DEFAULT_SESSION_COUNT;

  return Array.from({ length: safeCount }, (_, index) => {
    const name = `T${index + 1}`;

    return {
    id: `session-${name.toLowerCase()}`,
    name,
    startTime: buildSessionStartTime(index),
    duration: DEFAULT_SESSION_DURATION,
    maxCapacity,
    assignedPilots: [],
    status: 'pending',
    referenceTime: null,
    times: []
    };
  });
}

function buildSessionStartTime(index: number) {
  const baseMinutes = 9 * 60 + 30;
  const total = baseMinutes + index * 15;
  const hour = Math.floor(total / 60) % 24;
  const minute = total % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function getSessionTimeRange(startTime: string, duration: number) {
  const [hourPart, minutePart] = startTime.split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  const totalStartMinutes = Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : 0;
  const totalEndMinutes = totalStartMinutes + Math.max(duration, 0);

  const endHour = Math.floor(totalEndMinutes / 60) % 24;
  const endMinute = totalEndMinutes % 60;

  return `${startTime} – ${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
}
