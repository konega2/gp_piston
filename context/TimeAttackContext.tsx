'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createDefaultTimeAttackSessions,
  TimeAttackPilotTime,
  TimeAttackSession
} from '@/data/timeAttackSessions';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { usePilots } from '@/context/PilotsContext';
import { getEventRuntimeConfig, loadEventStorageItem, saveEventStorageItem } from '@/lib/eventStorage';

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
  closeSession: (sessionId: string) => void;
  togglePilotAssignment: (sessionId: string, pilotId: string) => { ok: boolean; reason?: 'closed' | 'full' | 'not-found' };
  saveSessionTimes: (input: SaveSessionTimesInput) => { ok: boolean; reason?: 'closed' | 'not-found' };
};

const STORAGE_KEY = 'timeAttack';

const TimeAttackContext = createContext<TimeAttackContextValue | null>(null);

export function TimeAttackProvider({ children }: { children: React.ReactNode }) {
  const { activeEventId, isHydrated: activeEventHydrated } = useActiveEvent();
  const { pilots, isHydrated: pilotsHydrated } = usePilots();

  const eventConfig = useMemo(() => {
    const config = getEventRuntimeConfig(activeEventId);
    return {
      sessionsCount: config.timeAttackSessions,
      sessionMaxCapacity: config.sessionMaxCapacity
    };
  }, [activeEventId]);

  const [sessions, setSessions] = useState<TimeAttackSession[]>(
    createDefaultTimeAttackSessions(eventConfig.sessionMaxCapacity, eventConfig.sessionsCount)
  );
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!activeEventHydrated || !pilotsHydrated) {
      return;
    }

    setIsHydrated(false);

    try {
      const raw = loadEventStorageItem(STORAGE_KEY, activeEventId);
      if (!raw) {
        const initialSessions = createDefaultTimeAttackSessions(eventConfig.sessionMaxCapacity, eventConfig.sessionsCount);
        const recalculated = recalculateCorrectedTimes(sortSessions(initialSessions));
        setSessions(recalculated);
        saveEventStorageItem(STORAGE_KEY, activeEventId, JSON.stringify(recalculated));
        setIsHydrated(true);
        return;
      }

      const parsed = JSON.parse(raw) as LegacyTimeAttackSession[];
      const normalized = normalizeSessions(parsed, pilots, eventConfig.sessionMaxCapacity, eventConfig.sessionsCount);
      setSessions(recalculateCorrectedTimes(sortSessions(normalized)));
    } catch {
      const fallback = createDefaultTimeAttackSessions(eventConfig.sessionMaxCapacity, eventConfig.sessionsCount);
      const recalculated = recalculateCorrectedTimes(sortSessions(fallback));
      setSessions(recalculated);
      saveEventStorageItem(STORAGE_KEY, activeEventId, JSON.stringify(recalculated));
    } finally {
      setIsHydrated(true);
    }
  }, [
    activeEventHydrated,
    pilotsHydrated,
    activeEventId,
    pilots,
    eventConfig.sessionMaxCapacity,
    eventConfig.sessionsCount
  ]);

  useEffect(() => {
    if (!isHydrated || !activeEventHydrated) {
      return;
    }

    saveEventStorageItem(STORAGE_KEY, activeEventId, JSON.stringify(sessions));
  }, [sessions, isHydrated, activeEventHydrated, activeEventId]);

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
    () => ({ sessions, isHydrated, bestReferenceTime, closeSession, togglePilotAssignment, saveSessionTimes }),
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
  if (!Array.isArray(value)) {
    return defaults;
  }

  const byName = new Map<string, LegacyTimeAttackSession>();
  value.forEach((session) => {
    if (session && typeof session === 'object' && typeof (session as LegacyTimeAttackSession).name === 'string') {
      byName.set((session as LegacyTimeAttackSession).name, session as LegacyTimeAttackSession);
    }
  });

  return defaults.map((defaultSession) => {
    const stored = byName.get(defaultSession.name);
    if (!stored) {
      return defaultSession;
    }

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
      startTime: defaultSession.startTime,
      duration: defaultSession.duration,
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
