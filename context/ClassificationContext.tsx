'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PilotRecord } from '@/data/pilots';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { usePilots } from '@/context/PilotsContext';
import { loadModuleState, saveModuleState } from '@/lib/eventStateClient';
import { useEventRuntimeConfig } from '@/lib/event-client';
import { updateEventRuntimeConfigAction } from '@/app/admin/events/[eventId]/actions';

export type QualySessionName = string;
export type QualyGroupName = string;

export type QualyPilotTime = {
  pilotId: string;
  qualyTime: number;
};

export type QualySession = {
  id: string;
  name: QualySessionName;
  groupName: QualyGroupName;
  startTime: string;
  duration: number;
  maxCapacity: number;
  assignedPilots: string[];
  status: 'pending' | 'completed';
  times: QualyPilotTime[];
};

export type QualyRecord = {
  pilotId: string;
  group: QualyGroupName;
  qualyTime: number | null;
};

type LegacyQualyRecord = {
  pilotId?: string;
  group?: string;
  qualyTime?: number | null;
};

type SaveQualyInput = {
  pilotId: string;
  qualyTime: number | null;
};

type LegacyQualySession = {
  id?: string;
  name?: string;
  groupName?: string;
  startTime?: string;
  duration?: number;
  maxCapacity?: number;
  assignedPilots?: string[];
  status?: 'pending' | 'completed';
  times?: Array<Partial<QualyPilotTime>>;
};

type ClassificationContextValue = {
  qualySessions: QualySession[];
  qualyRecords: QualyRecord[];
  isHydrated: boolean;
  groups: QualyGroupName[];
  addQualySession: () => { ok: true; id: string };
  deleteQualySession: (sessionId: string) => { ok: boolean; reason?: 'not-found' | 'last-session' };
  updateQualySessionStartTime: (sessionId: string, startTime: string) => { ok: boolean; reason?: 'not-found' | 'invalid-time' };
  updateQualySessionDuration: (sessionId: string, duration: number) => { ok: boolean; reason?: 'not-found' | 'invalid-duration' };
  updateQualySessionCapacity: (sessionId: string, maxCapacity: number) => { ok: boolean; reason?: 'not-found' | 'invalid-capacity' };
  saveQualyTimes: (entries: SaveQualyInput[]) => void;
  recalculateQualyAssignments: () => void;
  assignQualyByLevel: () => void;
  assignQualyByKart: () => void;
  assignQualyRandom: () => void;
  applyManualQualyAssignments: (manualAssignments: Record<string, string[]>) => void;
  resetQualyAssignments: () => void;
};

const QUALY_DURATION_MINUTES = 5;

const ClassificationContext = createContext<ClassificationContextValue | null>(null);

export function ClassificationProvider({ children }: { children: React.ReactNode }) {
  const { activeEventId, isHydrated: activeEventHydrated } = useActiveEvent();
  const { pilots, isHydrated: pilotsHydrated } = usePilots();
  const runtimeConfig = useEventRuntimeConfig(activeEventId);

  const eventConfig = useMemo(() => {
    if (!runtimeConfig) {
      return null;
    }

    return {
      qualyGroups: runtimeConfig.qualyGroups,
      maxParticipants: runtimeConfig.maxPilots
    };
  }, [runtimeConfig]);

  const [qualySessions, setQualySessions] = useState<QualySession[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!pilotsHydrated || !activeEventHydrated || !eventConfig) {
      return;
    }

    setIsHydrated(false);

    void (async () => {
      try {
        const stored = await loadModuleState<unknown>(activeEventId, 'qualy', null);
        if (stored) {
          const parsed = stored as unknown;
          const normalized = normalizeQualySessions(parsed, pilots, eventConfig.qualyGroups, eventConfig.maxParticipants);
          const withAutoAssignments = shouldAutoAssign(normalized)
            ? applyAssignmentsByLevel(normalized, pilots, eventConfig.qualyGroups, eventConfig.maxParticipants)
            : normalized;

          setQualySessions(withAutoAssignments);
          return;
        }

        const defaults = buildDefaultQualySessions(pilots, eventConfig.qualyGroups, eventConfig.maxParticipants);
        const withAutoAssignments = applyAssignmentsByLevel(defaults, pilots, eventConfig.qualyGroups, eventConfig.maxParticipants);

        setQualySessions(withAutoAssignments);
        await saveModuleState(activeEventId, 'qualy', withAutoAssignments);
      } catch {
        const fallback = buildDefaultQualySessions(pilots, eventConfig.qualyGroups, eventConfig.maxParticipants);
        const withAutoAssignments = applyAssignmentsByLevel(fallback, pilots, eventConfig.qualyGroups, eventConfig.maxParticipants);

        setQualySessions(withAutoAssignments);
        await saveModuleState(activeEventId, 'qualy', withAutoAssignments);
      } finally {
        setIsHydrated(true);
      }
    })();
  }, [pilots, pilotsHydrated, activeEventHydrated, activeEventId, eventConfig]);

  useEffect(() => {
    if (!isHydrated || !activeEventHydrated) {
      return;
    }

    void saveModuleState(activeEventId, 'qualy', qualySessions);
  }, [isHydrated, qualySessions, activeEventHydrated, activeEventId]);

  useEffect(() => {
    if (!isHydrated || !activeEventHydrated || qualySessions.length === 0) {
      return;
    }

    void updateEventRuntimeConfigAction(activeEventId, {
      qualyGroups: qualySessions.length
    });
  }, [isHydrated, activeEventHydrated, activeEventId, qualySessions.length]);

  const saveQualyTimes = (entries: SaveQualyInput[]) => {
    const timeMap = new Map<string, number | null>();
    entries.forEach((entry) => {
      const isValidNumber = typeof entry.qualyTime === 'number' && Number.isFinite(entry.qualyTime) && entry.qualyTime > 0;
      timeMap.set(entry.pilotId, isValidNumber ? entry.qualyTime : null);
    });

    setQualySessions((prev) =>
      prev.map((session) => {
        const nextTimes = session.assignedPilots
          .map((pilotId) => {
            if (!timeMap.has(pilotId)) {
              const existing = session.times.find((time) => time.pilotId === pilotId);
              return existing ?? null;
            }

            const value = timeMap.get(pilotId);
            if (typeof value !== 'number' || value <= 0) {
              return null;
            }

            return {
              pilotId,
              qualyTime: value
            };
          })
          .filter((item): item is QualyPilotTime => Boolean(item));

        return {
          ...session,
          times: nextTimes,
          status: session.assignedPilots.length > 0 && nextTimes.length === session.assignedPilots.length ? 'completed' : 'pending'
        };
      })
    );
  };

  const addQualySession = (): { ok: true; id: string } => {
    const nextNumber = getNextQualySessionNumber(qualySessions);
    const nextName = `Q${nextNumber}`;
    const nextGroupName = `Grupo ${nextNumber}`;
    const nextStartTime = getNextQualySessionStartTime(qualySessions);
    const nextDuration = qualySessions[0]?.duration ?? QUALY_DURATION_MINUTES;
    const nextCapacity = qualySessions[0]?.maxCapacity ?? Math.max(1, Math.ceil(pilots.length / Math.max(qualySessions.length, 1)));
    const id = crypto.randomUUID();

    setQualySessions((prev) =>
      sortQualySessions([
        ...prev,
        {
          id,
          name: nextName,
          groupName: nextGroupName,
          startTime: nextStartTime,
          duration: nextDuration,
          maxCapacity: nextCapacity,
          assignedPilots: [],
          status: 'pending',
          times: []
        }
      ])
    );

    return { ok: true, id };
  };

  const deleteQualySession = (sessionId: string): { ok: boolean; reason?: 'not-found' | 'last-session' } => {
    const exists = qualySessions.some((session) => session.id === sessionId);
    if (!exists) {
      return { ok: false, reason: 'not-found' };
    }

    if (qualySessions.length <= 1) {
      return { ok: false, reason: 'last-session' };
    }

    setQualySessions((prev) => prev.filter((session) => session.id !== sessionId));
    return { ok: true };
  };

  const updateQualySessionStartTime = (
    sessionId: string,
    startTime: string
  ): { ok: boolean; reason?: 'not-found' | 'invalid-time' } => {
    if (!isValidTimeString(startTime)) {
      return { ok: false, reason: 'invalid-time' };
    }

    const exists = qualySessions.some((session) => session.id === sessionId);
    if (!exists) {
      return { ok: false, reason: 'not-found' };
    }

    setQualySessions((prev) =>
      sortQualySessions(
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

  const updateQualySessionDuration = (
    sessionId: string,
    duration: number
  ): { ok: boolean; reason?: 'not-found' | 'invalid-duration' } => {
    if (!Number.isFinite(duration) || duration <= 0) {
      return { ok: false, reason: 'invalid-duration' };
    }

    const safeDuration = Math.floor(duration);
    const exists = qualySessions.some((session) => session.id === sessionId);
    if (!exists) {
      return { ok: false, reason: 'not-found' };
    }

    setQualySessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              duration: safeDuration
            }
          : session
      )
    );

    return { ok: true };
  };

  const updateQualySessionCapacity = (
    sessionId: string,
    maxCapacity: number
  ): { ok: boolean; reason?: 'not-found' | 'invalid-capacity' } => {
    if (!Number.isFinite(maxCapacity) || maxCapacity <= 0) {
      return { ok: false, reason: 'invalid-capacity' };
    }

    const safeCapacity = Math.floor(maxCapacity);
    const exists = qualySessions.some((session) => session.id === sessionId);
    if (!exists) {
      return { ok: false, reason: 'not-found' };
    }

    setQualySessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) {
          return session;
        }

        const assignedPilots = session.assignedPilots.slice(0, safeCapacity);
        const times = session.times.filter((time) => assignedPilots.includes(time.pilotId));
        const status: QualySession['status'] =
          assignedPilots.length > 0 && times.length === assignedPilots.length ? 'completed' : 'pending';

        return {
          ...session,
          maxCapacity: safeCapacity,
          assignedPilots,
          times,
          status
        };
      })
    );

    return { ok: true };
  };

  const recalculateQualyAssignments = () => {
    if (!eventConfig) {
      return;
    }

    setQualySessions((prev) =>
      applyAssignmentsByLevel(
        prev,
        pilots,
        getEffectiveGroupsCount(eventConfig.qualyGroups, prev),
        eventConfig.maxParticipants
      )
    );
  };

  const assignQualyByLevel = () => {
    if (!eventConfig) {
      return;
    }

    setQualySessions((prev) =>
      applyAssignmentsByPilotOrder(
        prev,
        pilots,
        getEffectiveGroupsCount(eventConfig.qualyGroups, prev),
        eventConfig.maxParticipants,
        orderPilotsByLevel
      )
    );
  };

  const assignQualyByKart = () => {
    if (!eventConfig) {
      return;
    }

    setQualySessions((prev) =>
      applyAssignmentsByPilotOrder(
        prev,
        pilots,
        getEffectiveGroupsCount(eventConfig.qualyGroups, prev),
        eventConfig.maxParticipants,
        orderPilotsByKart
      )
    );
  };

  const assignQualyRandom = () => {
    if (!eventConfig) {
      return;
    }

    setQualySessions((prev) =>
      applyAssignmentsByPilotOrder(
        prev,
        pilots,
        getEffectiveGroupsCount(eventConfig.qualyGroups, prev),
        eventConfig.maxParticipants,
        shufflePilots
      )
    );
  };

  const applyManualQualyAssignments = (manualAssignments: Record<string, string[]>) => {
    if (!eventConfig) {
      return;
    }

    setQualySessions((prev) =>
      applyManualAssignments(
        prev,
        pilots,
        getEffectiveGroupsCount(eventConfig.qualyGroups, prev),
        eventConfig.maxParticipants,
        manualAssignments
      )
    );
  };

  const resetQualyAssignments = () => {
    setQualySessions((prev) =>
      prev.map((session) => ({
        ...session,
        assignedPilots: [],
        times: [],
        status: 'pending'
      }))
    );
  };

  const qualyRecords = useMemo<QualyRecord[]>(() => {
    return qualySessions.flatMap((session) =>
      session.assignedPilots.map((pilotId) => {
        const found = session.times.find((time) => time.pilotId === pilotId);
        return {
          pilotId,
          group: session.groupName,
          qualyTime: found?.qualyTime ?? null
        };
      })
    );
  }, [qualySessions]);

  const groups = useMemo<QualyGroupName[]>(() => qualySessions.map((session) => session.groupName), [qualySessions]);

  const value = useMemo<ClassificationContextValue>(
    () => ({
      qualySessions,
      qualyRecords,
      isHydrated,
      groups,
      addQualySession,
      deleteQualySession,
      updateQualySessionStartTime,
      updateQualySessionDuration,
      updateQualySessionCapacity,
      saveQualyTimes,
      recalculateQualyAssignments,
      assignQualyByLevel,
      assignQualyByKart,
      assignQualyRandom,
      applyManualQualyAssignments,
      resetQualyAssignments
    }),
    [
      qualySessions,
      qualyRecords,
      isHydrated,
      groups,
      pilots,
      recalculateQualyAssignments,
      assignQualyByLevel,
      assignQualyByKart,
      assignQualyRandom,
      applyManualQualyAssignments,
      resetQualyAssignments
    ]
  );

  return <ClassificationContext.Provider value={value}>{children}</ClassificationContext.Provider>;
}

export function useClassification() {
  const context = useContext(ClassificationContext);
  if (!context) {
    throw new Error('useClassification debe usarse dentro de ClassificationProvider');
  }

  return context;
}

function normalizeQualyRecords(stored: unknown, pilots: PilotRecord[]): QualyRecord[] {
  const defaults = buildDefaultQualyRecords(pilots);
  if (!Array.isArray(stored)) {
    return defaults;
  }

  const byPilotId = new Map<string, LegacyQualyRecord>();
  stored.forEach((entry) => {
    if (entry && typeof entry === 'object' && typeof (entry as LegacyQualyRecord).pilotId === 'string') {
      byPilotId.set((entry as LegacyQualyRecord).pilotId ?? '', entry as LegacyQualyRecord);
    }
  });

  return defaults.map((defaultRecord) => {
    const found = byPilotId.get(defaultRecord.pilotId);
    if (!found) {
      return defaultRecord;
    }

    const normalizedGroup = parseGroup(found.group) ?? defaultRecord.group;
    const normalizedTime =
      typeof found.qualyTime === 'number' && Number.isFinite(found.qualyTime) && found.qualyTime > 0
        ? found.qualyTime
        : null;

    return {
      pilotId: defaultRecord.pilotId,
      group: normalizedGroup,
      qualyTime: normalizedTime
    };
  });
}

function buildDefaultQualyRecords(pilots: PilotRecord[]): QualyRecord[] {
  return buildDefaultQualySessions(pilots, 3, pilots.length).flatMap((session) =>
    session.assignedPilots.map((pilotId) => ({
      pilotId,
      group: session.groupName,
      qualyTime: null
    }))
  );
}

function buildDefaultQualySessions(_pilots: PilotRecord[], groupsCount: number, _maxParticipants: number): QualySession[] {
  const config = buildQualySessionsConfig(groupsCount);
  const safeGroups = config.length > 0 ? config.length : 1;
  const defaultCapacity = Math.max(1, Math.ceil(sanitizePositive(_maxParticipants, _pilots.length || 1) / safeGroups));

  return config.map((sessionConfig) => {
    return {
      id: `qualy-${sessionConfig.name.toLowerCase()}`,
      name: sessionConfig.name,
      groupName: sessionConfig.groupName,
      startTime: sessionConfig.startTime,
      duration: QUALY_DURATION_MINUTES,
      maxCapacity: defaultCapacity,
      assignedPilots: [],
      status: 'pending',
      times: []
    };
  });
}

function normalizeQualySessions(stored: unknown, pilots: PilotRecord[], groupsCount: number, maxParticipants: number): QualySession[] {
  const effectiveGroupsCount = getEffectiveGroupsCount(groupsCount, Array.isArray(stored) ? (stored as LegacyQualySession[]) : []);
  const defaults = buildDefaultQualySessions(pilots, effectiveGroupsCount, maxParticipants);
  const availablePilotIds = new Set(pilots.map((pilot) => pilot.id));
  if (!Array.isArray(stored)) {
    return defaults;
  }

  const looksLikeLegacyRecords = stored.every(
    (entry) => entry && typeof entry === 'object' && 'pilotId' in (entry as Record<string, unknown>)
  );

  if (looksLikeLegacyRecords) {
    return migrateLegacyRecordsToSessions(stored as LegacyQualyRecord[], pilots, groupsCount, maxParticipants);
  }

  const byName = new Map<QualySessionName, LegacyQualySession>();
  stored.forEach((session) => {
    const maybe = session as LegacyQualySession;
    const parsedName = parseSessionName(maybe.name);
    if (parsedName) {
      byName.set(parsedName, maybe);
    }
  });

  const normalized: QualySession[] = defaults.map((defaultSession): QualySession => {
    const found = byName.get(defaultSession.name);
    if (!found) {
      return defaultSession;
    }

    const assignedPilots = Array.isArray(found.assignedPilots)
      ? Array.from(
          new Set(
            found.assignedPilots.filter(
              (pilotId): pilotId is string => typeof pilotId === 'string' && availablePilotIds.has(pilotId)
            )
          )
        )
      : defaultSession.assignedPilots;

    const allowedPilots = new Set(assignedPilots);

    const times = Array.isArray(found.times)
      ? found.times
          .filter(
            (time): time is QualyPilotTime =>
              Boolean(time) &&
              typeof time?.pilotId === 'string' &&
              allowedPilots.has(time.pilotId) &&
              typeof time?.qualyTime === 'number' &&
              Number.isFinite(time.qualyTime) &&
              time.qualyTime > 0
          )
          .map((time) => ({ pilotId: time.pilotId, qualyTime: time.qualyTime }))
      : [];

    const status: QualySession['status'] =
      assignedPilots.length > 0 && times.length === assignedPilots.length ? 'completed' : 'pending';

    return {
      ...defaultSession,
      id: typeof found.id === 'string' ? found.id : defaultSession.id,
      name: parseSessionName(found.name) ?? defaultSession.name,
      groupName: parseGroup(found.groupName) ?? defaultSession.groupName,
      startTime: isValidTimeString(found.startTime) ? found.startTime : defaultSession.startTime,
      duration:
        typeof found.duration === 'number' && Number.isFinite(found.duration) && found.duration > 0
          ? Math.floor(found.duration)
          : defaultSession.duration,
      maxCapacity:
        typeof found.maxCapacity === 'number' && Number.isFinite(found.maxCapacity) && found.maxCapacity > 0
          ? Math.floor(found.maxCapacity)
          : defaultSession.maxCapacity,
      assignedPilots: assignedPilots.slice(0, typeof found.maxCapacity === 'number' && found.maxCapacity > 0 ? Math.floor(found.maxCapacity) : defaultSession.maxCapacity),
      status,
      times
    };
  });

  return sortQualySessions(normalized);
}

function shouldAutoAssign(sessions: QualySession[]) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return true;
  }

  return sessions.every((session) => session.assignedPilots.length === 0);
}

function migrateLegacyRecordsToSessions(
  records: LegacyQualyRecord[],
  pilots: PilotRecord[],
  groupsCount: number,
  maxParticipants: number
): QualySession[] {
  const defaults = buildDefaultQualySessions(pilots, groupsCount, maxParticipants);
  const byPilotId = new Map<string, LegacyQualyRecord>();

  records.forEach((entry) => {
    if (entry && typeof entry.pilotId === 'string') {
      byPilotId.set(entry.pilotId, entry);
    }
  });

  return defaults.map((session) => {
    const times = session.assignedPilots
      .map((pilotId) => {
        const found = byPilotId.get(pilotId);
        const group = parseGroup(found?.group) ?? session.groupName;
        const hasValidTime =
          group === session.groupName &&
          typeof found?.qualyTime === 'number' &&
          Number.isFinite(found.qualyTime) &&
          found.qualyTime > 0;

        if (!hasValidTime) {
          return null;
        }

        return {
          pilotId,
          qualyTime: found.qualyTime as number
        };
      })
      .filter((item): item is QualyPilotTime => Boolean(item));

    return {
      ...session,
      status: session.assignedPilots.length > 0 && times.length === session.assignedPilots.length ? 'completed' : 'pending',
      times
    };
  });
}

function applyAssignmentsByLevel(
  sessions: QualySession[],
  pilots: PilotRecord[],
  groupsCount: number,
  maxParticipants: number
): QualySession[] {
  return applyAssignmentsByPilotOrder(sessions, pilots, groupsCount, maxParticipants, orderPilotsByNumero);
}

function applyAssignmentsByPilotOrder(
  sessions: QualySession[],
  pilots: PilotRecord[],
  groupsCount: number,
  maxParticipants: number,
  orderPilots: (items: PilotRecord[]) => PilotRecord[]
): QualySession[] {
  const normalizedPilots = orderPilots([...pilots]).slice(0, sanitizePositive(maxParticipants, pilots.length));
  const config = buildQualySessionsConfig(groupsCount);
  const assignmentsBySession = buildBalancedAssignments(config, normalizedPilots);
  return buildSessionsFromAssignments(config, sessions, assignmentsBySession);
}

function applyManualAssignments(
  sessions: QualySession[],
  pilots: PilotRecord[],
  groupsCount: number,
  maxParticipants: number,
  manualAssignments: Record<string, string[]>
): QualySession[] {
  const config = buildQualySessionsConfig(groupsCount);
  const eligiblePilots = orderPilotsByNumero([...pilots]).slice(0, sanitizePositive(maxParticipants, pilots.length));
  const eligibleIds = new Set(eligiblePilots.map((pilot) => pilot.id));
  const assignmentsBySession = new Map<QualySessionName, string[]>();
  const used = new Set<string>();

  sessions.forEach((session) => {
    const requested = Array.isArray(manualAssignments[session.id]) ? manualAssignments[session.id] : [];
    const sanitized = requested.filter((pilotId) => eligibleIds.has(pilotId));
    assignmentsBySession.set(session.name, sanitized);
  });

  config.forEach((sessionConfig) => {
    const list = assignmentsBySession.get(sessionConfig.name) ?? [];
    const unique = list.filter((pilotId) => {
      if (used.has(pilotId)) {
        return false;
      }
      used.add(pilotId);
      return true;
    });
    assignmentsBySession.set(sessionConfig.name, unique);
  });

  return buildSessionsFromAssignments(config, sessions, assignmentsBySession);
}

function buildSessionsFromAssignments(
  config: Array<{ name: QualySessionName; groupName: QualyGroupName; startTime: string }>,
  sessions: QualySession[],
  assignmentsBySession: Map<QualySessionName, string[]>
): QualySession[] {
  const existingByName = new Map<QualySessionName, QualySession>(sessions.map((session) => [session.name, session]));
  const bestTimeByPilot = new Map<string, number>();

  sessions.forEach((session) => {
    session.times.forEach((time) => {
      if (!Number.isFinite(time.qualyTime) || time.qualyTime <= 0) {
        return;
      }

      const current = bestTimeByPilot.get(time.pilotId);
      if (typeof current !== 'number' || time.qualyTime < current) {
        bestTimeByPilot.set(time.pilotId, time.qualyTime);
      }
    });
  });

  return config.map((sessionConfig) => {
    const base = existingByName.get(sessionConfig.name);
    const maxCapacity = base?.maxCapacity ?? Math.max(1, Math.ceil((sessions.reduce((acc, item) => acc + item.assignedPilots.length, 0) || 1) / Math.max(config.length, 1)));
    const assignedPilots = (assignmentsBySession.get(sessionConfig.name) ?? []).slice(0, maxCapacity);

    const times = assignedPilots
      .map((pilotId) => {
        const value = bestTimeByPilot.get(pilotId);
        if (typeof value !== 'number' || value <= 0) {
          return null;
        }

        return {
          pilotId,
          qualyTime: value
        };
      })
      .filter((item): item is QualyPilotTime => Boolean(item));

    const status: QualySession['status'] =
      assignedPilots.length > 0 && times.length === assignedPilots.length ? 'completed' : 'pending';

    return {
      id: base?.id ?? `qualy-${sessionConfig.name.toLowerCase()}`,
      name: sessionConfig.name,
      groupName: sessionConfig.groupName,
      startTime: sessionConfig.startTime,
      duration: base?.duration ?? QUALY_DURATION_MINUTES,
      maxCapacity,
      assignedPilots,
      status,
      times
    };
  });
}

function buildBalancedAssignments(
  config: Array<{ name: QualySessionName; groupName: QualyGroupName; startTime: string }>,
  pilots: PilotRecord[]
) {
  const assignments = new Map<QualySessionName, string[]>(config.map((session) => [session.name, []]));
  const safeSessionCount = config.length > 0 ? config.length : 1;

  pilots.forEach((pilot, index) => {
    const targetSession = config[index % safeSessionCount];
    if (!targetSession) {
      return;
    }

    const list = assignments.get(targetSession.name);
    if (!list) {
      return;
    }

    list.push(pilot.id);
  });

  return assignments;
}

function orderPilotsByNumero(pilots: PilotRecord[]) {
  return [...pilots].sort((a, b) => a.numeroPiloto - b.numeroPiloto);
}

function orderPilotsByLevel(pilots: PilotRecord[]) {
  const priority: Record<PilotRecord['nivel'], number> = {
    PRO: 0,
    AMATEUR: 1,
    PRINCIPIANTE: 2
  };

  return [...pilots].sort((a, b) => {
    const levelDiff = priority[a.nivel] - priority[b.nivel];
    if (levelDiff !== 0) {
      return levelDiff;
    }
    return a.numeroPiloto - b.numeroPiloto;
  });
}

function orderPilotsByKart(pilots: PilotRecord[]) {
  const priority: Record<PilotRecord['kart'], number> = {
    '390cc': 0,
    '270cc': 1
  };

  return [...pilots].sort((a, b) => {
    const kartDiff = priority[a.kart] - priority[b.kart];
    if (kartDiff !== 0) {
      return kartDiff;
    }
    return a.numeroPiloto - b.numeroPiloto;
  });
}

function shufflePilots(pilots: PilotRecord[]) {
  const shuffled = [...pilots];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function parseSessionName(value: unknown): QualySessionName | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return null;
}

function parseGroup(value: unknown): QualyGroupName | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return null;
}

export function getQualySessionTimeRange(startTime: string, duration: number) {
  const [hourPart, minutePart] = startTime.split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  const totalStartMinutes = Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : 0;
  const totalEndMinutes = totalStartMinutes + Math.max(duration, 0);

  const endHour = Math.floor(totalEndMinutes / 60) % 24;
  const endMinute = totalEndMinutes % 60;

  return `${startTime} – ${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
}

function buildQualySessionsConfig(groupsCount: number) {
  const safeGroups = sanitizePositive(groupsCount, 3);

  return Array.from({ length: safeGroups }, (_, index) => ({
    name: `Q${index + 1}`,
    groupName: `Grupo ${index + 1}`,
    startTime: buildClockTime('11:30', index * 10)
  }));
}

function getEffectiveGroupsCount(groupsCount: number, sessions: Array<{ name?: string }> = []) {
  const base = sanitizePositive(groupsCount, 1);
  const maxFromSessions = sessions.reduce((max, session) => {
    const name = typeof session?.name === 'string' ? session.name : '';
    const numeric = sessionNumber(name);
    if (!Number.isFinite(numeric) || numeric === Number.MAX_SAFE_INTEGER) {
      return max;
    }
    return Math.max(max, numeric);
  }, 0);

  const byLength = Array.isArray(sessions) ? sessions.length : 0;
  return Math.max(base, maxFromSessions, byLength, 1);
}

function sortQualySessions(list: QualySession[]) {
  return [...list].sort((a, b) => sessionNumber(a.name) - sessionNumber(b.name));
}

function sessionNumber(name: string) {
  const parsed = Number(name.replace(/[^0-9]/g, ''));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Number.MAX_SAFE_INTEGER;
  }

  return parsed;
}

function getNextQualySessionNumber(list: QualySession[]) {
  const maxNumber = list.reduce((max, session) => Math.max(max, sessionNumber(session.name)), 0);
  if (!Number.isFinite(maxNumber) || maxNumber <= 0 || maxNumber === Number.MAX_SAFE_INTEGER) {
    return list.length + 1;
  }

  return maxNumber + 1;
}

function getNextQualySessionStartTime(list: QualySession[]) {
  if (list.length === 0) {
    return '11:30';
  }

  const sorted = sortQualySessions(list);
  const last = sorted[sorted.length - 1];
  const [hourPart, minutePart] = last.startTime.split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return '11:30';
  }

  const total = hour * 60 + minute + 10;
  const nextHour = Math.floor(total / 60) % 24;
  const nextMinute = total % 60;
  return `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`;
}

function isValidTimeString(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function sanitizePositive(value: number | undefined, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.floor(value);
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
