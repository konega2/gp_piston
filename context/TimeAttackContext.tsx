'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createDefaultTimeAttackSessions,
  DEFAULT_SESSION_DURATION,
  TimeAttackPilotTime,
  TimeAttackSession
} from '@/data/timeAttackSessions';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { usePilots } from '@/context/PilotsContext';
import { loadModuleState, saveModuleState } from '@/lib/eventStateClient';
import { useEventRuntimeConfig } from '@/lib/event-client';
import { updateEventRuntimeConfigAction } from '@/app/admin/events/[eventId]/actions';

type LegacyTimeAttackSession = {
  id: string;
  name: string;
  startTime?: string;
  duration?: number;
  maxCapacity?: number;
  assignedPilots?: string[];
  status?: 'pending' | 'closed';
  referenceTime?: number | null;
  times?: Array<Partial<TimeAttackPilotTime>>;
};

type SaveSessionTimesInput = {
  sessionId: string;
  pilotRawTimes: Array<{
    pilotId: string;
    rawTime: number;
  }>;
};

type TimeAttackContextValue = {
  sessions: TimeAttackSession[];
  isHydrated: boolean;
  bestReferenceTime: number | null;
  addSession: () => { ok: boolean; id: string };
  deleteSession: (sessionId: string) => { ok: boolean; reason?: 'not-found' | 'last-session' };
  closeSession: (sessionId: string) => void;
  updateSessionStartTime: (sessionId: string, startTime: string) => { ok: boolean; reason?: 'not-found' | 'invalid-time' };
  updateSessionDuration: (sessionId: string, duration: number) => { ok: boolean; reason?: 'not-found' | 'invalid-duration' };
  updateSessionCapacity: (sessionId: string, maxCapacity: number) => { ok: boolean; reason?: 'not-found' | 'invalid-capacity' };
  togglePilotAssignment: (sessionId: string, pilotId: string) => { ok: boolean; reason?: 'closed' | 'full' | 'not-found' };
  saveSessionTimes: (input: SaveSessionTimesInput) => { ok: boolean; reason?: 'closed' | 'not-found' };
};

const TimeAttackContext = createContext<TimeAttackContextValue | null>(null);

export function TimeAttackProvider({ children }: { children: React.ReactNode }) {
  const { activeEventId, isHydrated: activeEventHydrated } = useActiveEvent();
  const { pilots, isHydrated: pilotsHydrated } = usePilots();
  const runtimeConfig = useEventRuntimeConfig(activeEventId);

  const eventConfig = useMemo(() => {
    if (!runtimeConfig) {
      return null;
    }

    return {
      sessionsCount: runtimeConfig.timeAttackSessions,
      sessionMaxCapacity: runtimeConfig.sessionMaxCapacity
    };
  }, [runtimeConfig]);

  const [sessions, setSessions] = useState<TimeAttackSession[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!activeEventHydrated || !pilotsHydrated || !eventConfig) {
      return;
    }

    setIsHydrated(false);

    void (async () => {
      try {
        const stored = await loadModuleState<LegacyTimeAttackSession[]>(activeEventId, 'timeAttack', []);
        if (!Array.isArray(stored) || stored.length === 0) {
          const initialSessions = createDefaultTimeAttackSessions(eventConfig.sessionMaxCapacity, eventConfig.sessionsCount);
          const recalculated = recalculateCorrectedTimes(sortSessions(initialSessions));
          setSessions(recalculated);
          await saveModuleState(activeEventId, 'timeAttack', recalculated);
          return;
        }

        const normalized = normalizeSessions(stored, pilots, eventConfig.sessionMaxCapacity, eventConfig.sessionsCount);
        setSessions(recalculateCorrectedTimes(sortSessions(normalized)));
      } catch {
        const initialSessions = createDefaultTimeAttackSessions(eventConfig.sessionMaxCapacity, eventConfig.sessionsCount);
        const recalculated = recalculateCorrectedTimes(sortSessions(initialSessions));
        setSessions(recalculated);
        await saveModuleState(activeEventId, 'timeAttack', recalculated);
      } finally {
        setIsHydrated(true);
      }
    })();
  }, [activeEventHydrated, pilotsHydrated, activeEventId, pilots, eventConfig]);

  useEffect(() => {
    if (!isHydrated || !activeEventHydrated) {
      return;
    }

    void saveModuleState(activeEventId, 'timeAttack', sessions);
  }, [sessions, isHydrated, activeEventHydrated, activeEventId]);

  const syncedSessionCount = sessions.length;
  const syncedMaxCapacity = useMemo(() => {
    if (sessions.length === 0) {
      return null;
    }

    return sessions.reduce((max, session) => Math.max(max, session.maxCapacity), 1);
  }, [sessions]);

  useEffect(() => {
    if (!isHydrated || !activeEventHydrated || !syncedMaxCapacity) {
      return;
    }

    void updateEventRuntimeConfigAction(activeEventId, {
      timeAttackSessions: syncedSessionCount,
      sessionMaxCapacity: syncedMaxCapacity
    });
  }, [isHydrated, activeEventHydrated, activeEventId, syncedSessionCount, syncedMaxCapacity]);

  const addSession = (): { ok: boolean; id: string } => {
    const nextNumber = getNextSessionNumber(sessions);
    const nextName = `T${nextNumber}`;
    const nextStartTime = getNextSessionStartTime(sessions);
    const maxCapacity = sessions[0]?.maxCapacity ?? eventConfig?.sessionMaxCapacity ?? 20;
    const duration = sessions[0]?.duration ?? DEFAULT_SESSION_DURATION;
    const id = crypto.randomUUID();

    setSessions((prev) =>
      sortSessions([
        ...prev,
        {
          id,
          name: nextName,
          startTime: nextStartTime,
          duration,
          maxCapacity,
          assignedPilots: [],
          status: 'pending',
          referenceTime: null,
          times: []
        }
      ])
    );

    return { ok: true, id };
  };

  const deleteSession = (sessionId: string): { ok: boolean; reason?: 'not-found' | 'last-session' } => {
    const target = sessions.find((session) => session.id === sessionId);
    if (!target) {
      return { ok: false, reason: 'not-found' };
    }

    if (sessions.length <= 1) {
      return { ok: false, reason: 'last-session' };
    }

    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
    return { ok: true };
  };

  const closeSession = (sessionId: string) => {
    setSessions((prev) =>
      recalculateCorrectedTimes(
        sortSessions(
          prev.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  status: 'closed'
                }
              : session
          )
        )
      )
    );
  };

  const updateSessionStartTime = (
    sessionId: string,
    startTime: string
  ): { ok: boolean; reason?: 'not-found' | 'invalid-time' } => {
    if (!isValidTimeString(startTime)) {
      return { ok: false, reason: 'invalid-time' };
    }

    const target = sessions.find((session) => session.id === sessionId);
    if (!target) {
      return { ok: false, reason: 'not-found' };
    }

    setSessions((prev) =>
      sortSessions(
        prev.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                startTime
              }
            : session
        )
      )
    );

    return { ok: true };
  };

  const updateSessionDuration = (
    sessionId: string,
    duration: number
  ): { ok: boolean; reason?: 'not-found' | 'invalid-duration' } => {
    if (!Number.isFinite(duration) || duration <= 0) {
      return { ok: false, reason: 'invalid-duration' };
    }

    const safeDuration = Math.floor(duration);
    if (safeDuration <= 0) {
      return { ok: false, reason: 'invalid-duration' };
    }

    const target = sessions.find((session) => session.id === sessionId);
    if (!target) {
      return { ok: false, reason: 'not-found' };
    }

    setSessions((prev) =>
      sortSessions(
        prev.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                duration: safeDuration
              }
            : session
        )
      )
    );

    return { ok: true };
  };

  const updateSessionCapacity = (
    sessionId: string,
    maxCapacity: number
  ): { ok: boolean; reason?: 'not-found' | 'invalid-capacity' } => {
    if (!Number.isFinite(maxCapacity) || maxCapacity <= 0) {
      return { ok: false, reason: 'invalid-capacity' };
    }

    const safeCapacity = Math.floor(maxCapacity);
    if (safeCapacity <= 0) {
      return { ok: false, reason: 'invalid-capacity' };
    }

    const target = sessions.find((session) => session.id === sessionId);
    if (!target) {
      return { ok: false, reason: 'not-found' };
    }

    setSessions((prev) =>
      sortSessions(
        prev.map((session) => {
          if (session.id !== sessionId) {
            return session;
          }

          const nextAssigned = session.assignedPilots.slice(0, safeCapacity);
          const nextTimes = session.times.filter((time) => nextAssigned.includes(time.pilotId));

          return {
            ...session,
            maxCapacity: safeCapacity,
            assignedPilots: nextAssigned,
            times: nextTimes
          };
        })
      )
    );

    return { ok: true };
  };

  const togglePilotAssignment = (
    sessionId: string,
    pilotId: string
  ): { ok: boolean; reason?: 'closed' | 'full' | 'not-found' } => {
    const target = sessions.find((session) => session.id === sessionId);
    if (!target) {
      return { ok: false, reason: 'not-found' };
    }

    const alreadyAssigned = target.assignedPilots.includes(pilotId);

    if (!alreadyAssigned && target.status === 'closed') {
      return { ok: false, reason: 'closed' };
    }

    if (!alreadyAssigned && target.assignedPilots.length >= target.maxCapacity) {
      return { ok: false, reason: 'full' };
    }

    setSessions((prev) =>
      recalculateCorrectedTimes(
        sortSessions(
          prev.map((session) => {
            if (session.id !== sessionId) {
              return session;
            }

            const nextAssigned = session.assignedPilots.includes(pilotId)
              ? session.assignedPilots.filter((id) => id !== pilotId)
              : [...session.assignedPilots, pilotId];

            return {
              ...session,
              assignedPilots: nextAssigned,
              times: session.times.filter((time) => nextAssigned.includes(time.pilotId))
            };
          })
        )
      )
    );

    return { ok: true };
  };

  const saveSessionTimes = ({ sessionId, pilotRawTimes }: SaveSessionTimesInput) => {
    const target = sessions.find((session) => session.id === sessionId);
    if (!target) {
      return { ok: false, reason: 'not-found' as const };
    }

    if (target.status === 'closed') {
      return { ok: false, reason: 'closed' as const };
    }

    const validTimeMap = new Map<string, number>();
    pilotRawTimes.forEach((item) => {
      if (target.assignedPilots.includes(item.pilotId) && Number.isFinite(item.rawTime) && item.rawTime > 0) {
        validTimeMap.set(item.pilotId, item.rawTime);
      }
    });

    setSessions((prev) =>
      recalculateCorrectedTimes(
        sortSessions(
          prev.map((session) => {
            if (session.id !== sessionId) {
              return session;
            }

            const nextTimes = session.assignedPilots
              .filter((pilotId) => validTimeMap.has(pilotId))
              .map((pilotId) => ({
                pilotId,
                rawTime: Number(validTimeMap.get(pilotId) ?? 0),
                correctedTime: Number(validTimeMap.get(pilotId) ?? 0)
              }));

            return {
              ...session,
              referenceTime: null,
              times: nextTimes
            };
          })
        )
      )
    );

    return { ok: true as const };
  };

  const bestReferenceTime = useMemo(() => {
    const values = sessions
      .map((session) => session.referenceTime)
      .filter((value): value is number => typeof value === 'number' && value > 0);

    return values.length > 0 ? Math.min(...values) : null;
  }, [sessions]);

  const value = useMemo<TimeAttackContextValue>(
    () => ({
      sessions,
      isHydrated,
      bestReferenceTime,
      addSession,
      deleteSession,
      closeSession,
      updateSessionStartTime,
      updateSessionDuration,
      updateSessionCapacity,
      togglePilotAssignment,
      saveSessionTimes
    }),
    [sessions, isHydrated, bestReferenceTime]
  );

  return <TimeAttackContext.Provider value={value}>{children}</TimeAttackContext.Provider>;
}

export function useTimeAttackSessions() {
  const context = useContext(TimeAttackContext);
  if (!context) {
    throw new Error('useTimeAttackSessions debe usarse dentro de TimeAttackProvider');
  }

  return context;
}

function normalizeSessions(
  value: unknown,
  pilots: Array<{ id: string; numeroPiloto: number; hasTimeAttack: boolean }>,
  maxCapacity: number,
  sessionsCount: number
): TimeAttackSession[] {
  const defaults = createDefaultTimeAttackSessions(maxCapacity, sessionsCount);
  const eligiblePilotIds = getEligibleTimeAttackPilotIds(pilots);
  if (!Array.isArray(value) || value.length === 0) {
    return defaults;
  }

  const normalizedStored: TimeAttackSession[] = value
    .filter(
      (session): session is LegacyTimeAttackSession =>
        Boolean(session) && typeof session === 'object' && typeof (session as LegacyTimeAttackSession).name === 'string'
    )
    .map((stored, index): TimeAttackSession => {
      const defaultSession = defaults[index] ?? defaults[defaults.length - 1] ?? createDefaultTimeAttackSessions(maxCapacity, 1)[0];

      const normalizedTimes = Array.isArray(stored.times)
        ? stored.times
            .filter(
              (time): time is Required<Pick<TimeAttackPilotTime, 'pilotId' | 'rawTime'>> =>
                Boolean(time) &&
                typeof time?.pilotId === 'string' &&
                typeof time?.rawTime === 'number' &&
                time.rawTime > 0
            )
            .map((time) => ({
              pilotId: time.pilotId,
              rawTime: time.rawTime,
              correctedTime: time.rawTime
            }))
        : [];

      return {
        ...defaultSession,
        id: typeof stored.id === 'string' ? stored.id : defaultSession.id,
        name: typeof stored.name === 'string' && stored.name.trim().length > 0 ? stored.name : defaultSession.name,
        startTime: isValidTimeString(stored.startTime) ? stored.startTime : defaultSession.startTime,
        duration:
          typeof stored.duration === 'number' && Number.isFinite(stored.duration) && stored.duration > 0
            ? Math.floor(stored.duration)
            : defaultSession.duration,
        maxCapacity:
          typeof stored.maxCapacity === 'number' && Number.isFinite(stored.maxCapacity) && stored.maxCapacity > 0
            ? Math.floor(stored.maxCapacity)
            : maxCapacity,
        assignedPilots: Array.isArray(stored.assignedPilots)
          ? Array.from(
              new Set(
                stored.assignedPilots.filter(
                  (pilotId): pilotId is string => typeof pilotId === 'string' && eligiblePilotIds.has(pilotId)
                )
              )
            )
          : defaultSession.assignedPilots,
        status: stored.status === 'closed' ? 'closed' : 'pending',
        referenceTime: null,
        times: normalizedTimes.filter((time) => eligiblePilotIds.has(time.pilotId))
      };
    });

  return normalizedStored.length > 0 ? normalizedStored : defaults;
}

function recalculateCorrectedTimes(list: TimeAttackSession[]): TimeAttackSession[] {
  return list.map((session) => {
    return {
      ...session,
      times: session.times
        .filter((time) => session.assignedPilots.includes(time.pilotId))
        .map((time) => ({
          ...time,
          correctedTime: roundTime(time.rawTime)
        }))
    };
  });
}

function roundTime(value: number) {
  return Math.round(value * 1000) / 1000;
}

function sortSessions(list: TimeAttackSession[]) {
  return [...list].sort((a, b) => sessionNumber(a.name) - sessionNumber(b.name));
}

function getEligibleTimeAttackPilotIds(pilots: Array<{ id: string; numeroPiloto: number; hasTimeAttack: boolean }>) {
  return new Set(pilots.filter((pilot) => shouldParticipateInTimeAttack(pilot)).map((pilot) => pilot.id));
}

function shouldParticipateInTimeAttack(pilot: { hasTimeAttack: boolean }) {
  return pilot.hasTimeAttack;
}

function sessionNumber(name: string) {
  const parsed = Number(name.replace(/[^0-9]/g, ''));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Number.MAX_SAFE_INTEGER;
  }

  return parsed;
}

function isValidTimeString(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function getNextSessionNumber(list: TimeAttackSession[]) {
  const maxNumber = list.reduce((max, session) => Math.max(max, sessionNumber(session.name)), 0);
  if (!Number.isFinite(maxNumber) || maxNumber <= 0 || maxNumber === Number.MAX_SAFE_INTEGER) {
    return list.length + 1;
  }

  return maxNumber + 1;
}

function getNextSessionStartTime(list: TimeAttackSession[]) {
  if (list.length === 0) {
    return '09:30';
  }

  const sorted = sortSessions(list);
  const last = sorted[sorted.length - 1];
  const [hourPart, minutePart] = last.startTime.split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return '09:30';
  }

  const total = hour * 60 + minute + 15;
  const nextHour = Math.floor(total / 60) % 24;
  const nextMinute = total % 60;
  return `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`;
}
