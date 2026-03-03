'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { useClassification } from '@/context/ClassificationContext';
import { usePilots } from '@/context/PilotsContext';
import { useTimeAttackSessions } from '@/context/TimeAttackContext';
import { loadModuleState, saveModuleState } from '@/lib/eventStateClient';
import { EMPTY_RACE_RESULT, normalizeRaceResult, type StoredResults, type TeamRecord } from '@/lib/resultsEngine';
import { useEventRuntimeConfig } from '@/lib/event-client';
import { getResultsSnapshotByEventAction, getTeamsByEventAction } from '@/app/admin/events/[eventId]/actions';

type EventPhaseState = {
  timeAttackCompleted: boolean;
  qualyCompleted: boolean;
  teamsGenerated: boolean;
  race1Completed: boolean;
  race2Completed: boolean;
  resultsFinalized: boolean;
  eventClosed: boolean;
};

type PhaseKey = keyof EventPhaseState;
type PhaseVisualStatus = 'completed' | 'in-progress' | 'blocked';

type PhaseConfig = {
  key: PhaseKey;
  title: string;
  subtitle: string;
  rule: string;
};

type EventStatusMode = 'automatic' | 'manual';

type EventOperationalPhase =
  | 'pre-evento'
  | 'time-attack'
  | 'qualy'
  | 'equipos'
  | 'carrera-1'
  | 'carrera-2'
  | 'resultados'
  | 'evento-cerrado';

type EventStatusControl = {
  mode: EventStatusMode;
  manualPhase: EventOperationalPhase;
};

type TimeWindow = {
  phase: EventOperationalPhase;
  start: number;
  end: number;
};

const EMPTY_RESULTS: StoredResults = {
  race1: EMPTY_RACE_RESULT,
  race2: EMPTY_RACE_RESULT
};

const DEFAULT_STATUS_CONTROL: EventStatusControl = {
  mode: 'automatic',
  manualPhase: 'pre-evento'
};

const OPERATIONAL_PHASE_LABEL: Record<EventOperationalPhase, string> = {
  'pre-evento': 'Pre-evento',
  'time-attack': 'Time Attack',
  qualy: 'Qualy',
  equipos: 'Equipos',
  'carrera-1': 'Carrera 1',
  'carrera-2': 'Carrera 2',
  resultados: 'Resultados',
  'evento-cerrado': 'Evento cerrado'
};

const MANUAL_PHASES: EventOperationalPhase[] = [
  'pre-evento',
  'time-attack',
  'qualy',
  'equipos',
  'carrera-1',
  'carrera-2',
  'resultados',
  'evento-cerrado'
];

const phaseConfig: PhaseConfig[] = [
  {
    key: 'timeAttackCompleted',
    title: 'TIME ATTACK',
    subtitle: 'Sesiones y cronometraje inicial',
    rule: 'Todas las sesiones Time Attack cerradas'
  },
  {
    key: 'qualyCompleted',
    title: 'CLASIFICACIÓN',
    subtitle: 'Qualy y orden oficial',
    rule: 'Todos los pilotos asignados con qualyTime'
  },
  {
    key: 'teamsGenerated',
    title: 'EQUIPOS',
    subtitle: 'Generación de equipos',
    rule: 'Cantidad de equipos configurada para el evento'
  },
  {
    key: 'race1Completed',
    title: 'CARRERA 1',
    subtitle: 'Parrilla y resultado oficial',
    rule: 'Todos los pilotos con race1Points definidos'
  },
  {
    key: 'race2Completed',
    title: 'CARRERA 2',
    subtitle: 'Parrilla y resultado oficial',
    rule: 'Todos los pilotos con race2Points definidos'
  },
  {
    key: 'resultsFinalized',
    title: 'RESULTADOS',
    subtitle: 'Puntuación y clasificaciones',
    rule: 'Todos los pilotos con totalPoints > 0'
  },
  {
    key: 'eventClosed',
    title: 'EVENTO CERRADO',
    subtitle: 'Cierre operativo del evento',
    rule: 'Todas las fases anteriores completadas'
  }
];

export default function EventStatusPage() {
  const { activeEventId, isHydrated: activeEventHydrated } = useActiveEvent();
  const runtimeConfig = useEventRuntimeConfig(activeEventId);
  const { pilots, isHydrated: pilotsHydrated } = usePilots();
  const { sessions, isHydrated: timeAttackHydrated } = useTimeAttackSessions();
  const { qualySessions, qualyRecords, isHydrated: qualyHydrated } = useClassification();

  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [results, setResults] = useState<StoredResults>(EMPTY_RESULTS);
  const [isStorageHydrated, setIsStorageHydrated] = useState(false);
  const [statusControl, setStatusControl] = useState<EventStatusControl>(DEFAULT_STATUS_CONTROL);
  const [isStatusControlHydrated, setIsStatusControlHydrated] = useState(false);
  const [racesPayload, setRacesPayload] = useState<unknown>(null);

  const eventConfig = useMemo(() => runtimeConfig, [runtimeConfig]);

  useEffect(() => {
    if (!activeEventHydrated) {
      return;
    }

    setIsStorageHydrated(false);

    void (async () => {
      try {
        const parsedTeams = await getTeamsByEventAction(activeEventId);
        setTeams(normalizeTeams(parsedTeams));

        const parsedResults = await getResultsSnapshotByEventAction(activeEventId);
        setResults({
          race1: normalizeRaceResult(parsedResults?.race1),
          race2: normalizeRaceResult(parsedResults?.race2)
        });
      } catch {
        setTeams([]);
        setResults(EMPTY_RESULTS);
      } finally {
        setIsStorageHydrated(true);
      }
    })();
  }, [activeEventHydrated, activeEventId]);

  useEffect(() => {
    if (!activeEventHydrated) {
      return;
    }

    setIsStatusControlHydrated(false);

    void (async () => {
      try {
        const [storedControl, storedRaces] = await Promise.all([
          loadModuleState<unknown>(activeEventId, 'eventStatus', null),
          loadModuleState<unknown>(activeEventId, 'races', null)
        ]);

        setStatusControl(normalizeStatusControl(storedControl));
        setRacesPayload(storedRaces);
      } catch {
        setStatusControl(DEFAULT_STATUS_CONTROL);
        setRacesPayload(null);
      } finally {
        setIsStatusControlHydrated(true);
      }
    })();
  }, [activeEventHydrated, activeEventId]);

  useEffect(() => {
    if (!activeEventHydrated || !isStatusControlHydrated) {
      return;
    }

    void saveModuleState(activeEventId, 'eventStatus', statusControl);
  }, [activeEventHydrated, activeEventId, isStatusControlHydrated, statusControl]);

  const isHydrated = pilotsHydrated && timeAttackHydrated && qualyHydrated && activeEventHydrated && isStorageHydrated;

  const race1PointsByPilot = useMemo(() => {
    return new Map(
      results.race1.entries
        .filter((entry) => Number.isFinite(entry.finalPoints))
        .map((entry) => [entry.pilotId, entry.finalPoints] as const)
    );
  }, [results.race1.entries]);

  const race2PointsByPilot = useMemo(() => {
    return new Map(
      results.race2.entries
        .filter((entry) => Number.isFinite(entry.finalPoints))
        .map((entry) => [entry.pilotId, entry.finalPoints] as const)
    );
  }, [results.race2.entries]);

  const assignedQualyPilotIds = useMemo(() => {
    return Array.from(new Set(qualySessions.flatMap((session) => session.assignedPilots)));
  }, [qualySessions]);

  const qualyTimesByPilot = useMemo(() => {
    return new Map(
      qualyRecords
        .filter((record) => Number.isFinite(record.qualyTime) && (record.qualyTime ?? 0) > 0)
        .map((record) => [record.pilotId, record.qualyTime as number] as const)
    );
  }, [qualyRecords]);

  const status = useMemo<EventPhaseState>(() => {
    const timeAttackCompleted = sessions.some((session) => session.times.length > 0);

    const qualyCompleted =
      assignedQualyPilotIds.length > 0 && assignedQualyPilotIds.every((pilotId) => qualyTimesByPilot.has(pilotId));

    const uniqueAssignedPilots = new Set(
      teams.flatMap((team) => team.members.filter((pilotId): pilotId is string => typeof pilotId === 'string'))
    );

    const teamsGenerated =
      teams.length === (eventConfig?.teamsCount ?? 0) &&
      teams.every((team) => Array.isArray(team.members)) &&
      uniqueAssignedPilots.size > 0;

    const race1Completed = pilots.length > 0 && pilots.every((pilot) => race1PointsByPilot.has(pilot.id));

    const race2Completed = pilots.length > 0 && pilots.every((pilot) => race2PointsByPilot.has(pilot.id));

    const resultsFinalized =
      pilots.length > 0 &&
      pilots.every((pilot) => {
        const race1 = race1PointsByPilot.get(pilot.id);
        const race2 = race2PointsByPilot.get(pilot.id);

        if (typeof race1 !== 'number' || typeof race2 !== 'number') {
          return false;
        }

        return race1 + race2 > 0;
      });

    const eventClosed =
      timeAttackCompleted && qualyCompleted && teamsGenerated && race1Completed && race2Completed && resultsFinalized;

    return {
      timeAttackCompleted,
      qualyCompleted,
      teamsGenerated,
      race1Completed,
      race2Completed,
      resultsFinalized,
      eventClosed
    };
  }, [assignedQualyPilotIds, pilots, qualyTimesByPilot, race1PointsByPilot, race2PointsByPilot, sessions, teams, eventConfig?.teamsCount]);

  const progressByPhase = useMemo<Record<PhaseKey, boolean>>(
    () => ({
      timeAttackCompleted:
        sessions.some((session) => session.status === 'closed' || session.assignedPilots.length > 0 || session.times.length > 0),
      qualyCompleted:
        assignedQualyPilotIds.length > 0 && assignedQualyPilotIds.some((pilotId) => qualyTimesByPilot.has(pilotId)),
      teamsGenerated: teams.length > 0,
      race1Completed: results.race1.entries.length > 0,
      race2Completed: results.race2.entries.length > 0,
      resultsFinalized: pilots.some((pilot) => {
        const race1 = race1PointsByPilot.get(pilot.id) ?? 0;
        const race2 = race2PointsByPilot.get(pilot.id) ?? 0;
        return race1 + race2 > 0;
      }),
      eventClosed:
        status.timeAttackCompleted ||
        status.qualyCompleted ||
        status.teamsGenerated ||
        status.race1Completed ||
        status.race2Completed ||
        status.resultsFinalized
    }),
    [assignedQualyPilotIds, pilots, qualyTimesByPilot, race1PointsByPilot, race2PointsByPilot, results, sessions, status, teams]
  );

  const prerequisitesByPhase = useMemo<Record<PhaseKey, Array<PhaseKey>>>(
    () => ({
      timeAttackCompleted: [],
      qualyCompleted: ['timeAttackCompleted'],
      teamsGenerated: ['qualyCompleted'],
      race1Completed: ['teamsGenerated'],
      race2Completed: ['race1Completed'],
      resultsFinalized: ['race1Completed', 'race2Completed'],
      eventClosed: ['timeAttackCompleted', 'qualyCompleted', 'teamsGenerated', 'race1Completed', 'race2Completed', 'resultsFinalized']
    }),
    []
  );

  const visualStatusByPhase = useMemo<Record<PhaseKey, PhaseVisualStatus>>(() => {
    const output = {} as Record<PhaseKey, PhaseVisualStatus>;

    phaseConfig.forEach((phase) => {
      if (status[phase.key]) {
        output[phase.key] = 'completed';
        return;
      }

      const prerequisites = prerequisitesByPhase[phase.key];
      const prerequisitesMet = prerequisites.every((key) => status[key]);

      if (progressByPhase[phase.key] || prerequisitesMet) {
        output[phase.key] = 'in-progress';
        return;
      }

      output[phase.key] = 'blocked';
    });

    return output;
  }, [prerequisitesByPhase, progressByPhase, status]);

  const completedCount = useMemo(
    () => Object.values(status).filter(Boolean).length,
    [status]
  );

  const automaticPhase = useMemo<EventOperationalPhase>(() => {
    if (status.eventClosed) {
      return 'evento-cerrado';
    }

    const nowMinutes = getCurrentMinutes();
    const taWindows = buildSessionWindows(
      sessions.map((session) => ({
        startTime: session.startTime,
        duration: session.duration
      })),
      'time-attack'
    );
    const qualyWindows = buildSessionWindows(
      qualySessions.map((session) => ({
        startTime: session.startTime,
        duration: session.duration
      })),
      'qualy'
    );
    const raceWindows = buildRaceWindows(racesPayload);

    const allWindows = [...taWindows, ...qualyWindows, ...raceWindows].sort((a, b) => a.start - b.start);

    const activeWindow = allWindows.find((window) => nowMinutes >= window.start && nowMinutes < window.end);
    if (activeWindow) {
      return activeWindow.phase;
    }

    if (status.qualyCompleted && !status.teamsGenerated) {
      return 'equipos';
    }

    if (status.race2Completed || status.resultsFinalized || results.race1.entries.length > 0 || results.race2.entries.length > 0) {
      return 'resultados';
    }

    if (status.race1Completed && !status.race2Completed) {
      return 'carrera-2';
    }

    if (status.teamsGenerated && !status.race1Completed) {
      return 'carrera-1';
    }

    const earliestStart = allWindows.length > 0 ? allWindows[0].start : null;
    if (typeof earliestStart === 'number' && nowMinutes < earliestStart) {
      return 'pre-evento';
    }

    if (status.timeAttackCompleted && !status.qualyCompleted) {
      return 'qualy';
    }

    return 'pre-evento';
  }, [qualySessions, results.race1.entries.length, results.race2.entries.length, sessions, status, racesPayload]);

  const activeOperationalPhase = statusControl.mode === 'manual' ? statusControl.manualPhase : automaticPhase;
  const sourceLabel = statusControl.mode === 'manual' ? 'Manual' : 'Automático por horario';
  const canEditControl = isStatusControlHydrated && activeEventHydrated;

  return (
    <main className="min-h-screen bg-gp-bg text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar activeItem="event-status" />

        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(0,207,255,0.09),transparent_42%),radial-gradient(circle_at_85%_18%,rgba(225,6,0,0.08),transparent_40%),linear-gradient(to_bottom,#0A0F16,#0A0F16)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-size:11px_11px] [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />

          <div className="relative z-10">
            <Header title="EVENT STATUS" subtitle="Panel de dirección de carrera" />

            <section className="px-5 py-6 sm:px-6">
              <div className="mx-auto max-w-7xl space-y-5">
                <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">CONTROL DE FASES</p>
                      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.14em] text-white">ESTADO DEL EVENTO</h1>
                    </div>

                    <Link
                      href={`/admin/events/${activeEventId}/dashboard`}
                      className="inline-flex items-center gap-2 rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition-colors duration-200 hover:bg-gp-telemetryBlue/20"
                    >
                      <span aria-hidden>←</span>
                      Volver a Dashboard
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">Fases completadas</p>
                      <p className="mt-1 text-lg font-semibold text-white">{completedCount} / {phaseConfig.length}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">Estado operativo actual</p>
                      <p className="mt-1 text-lg font-semibold text-cyan-200">{OPERATIONAL_PHASE_LABEL[activeOperationalPhase]}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">Fuente de estado</p>
                      <p className="mt-1 text-lg font-semibold text-white">{sourceLabel}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">Modo de control</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={!canEditControl}
                        onClick={() => setStatusControl((prev) => ({ ...prev, mode: 'automatic' }))}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                          statusControl.mode === 'automatic'
                            ? 'border-gp-telemetryBlue/60 bg-gp-telemetryBlue/20 text-cyan-200'
                            : 'border-white/15 bg-black/20 text-gp-textSoft hover:bg-white/10'
                        }`}
                      >
                        Automático
                      </button>
                      <button
                        type="button"
                        disabled={!canEditControl}
                        onClick={() => setStatusControl((prev) => ({ ...prev, mode: 'manual' }))}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                          statusControl.mode === 'manual'
                            ? 'border-gp-telemetryBlue/60 bg-gp-telemetryBlue/20 text-cyan-200'
                            : 'border-white/15 bg-black/20 text-gp-textSoft hover:bg-white/10'
                        }`}
                      >
                        Manual
                      </button>
                    </div>

                    {statusControl.mode === 'automatic' ? (
                      <p className="mt-3 text-[11px] uppercase tracking-[0.11em] text-white/60">
                        El estado se actualiza según las horas configuradas de Time Attack, Qualy y Carreras.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <p className="text-[11px] uppercase tracking-[0.11em] text-white/60">Selecciona el estado manual del evento:</p>
                        <div className="flex flex-wrap gap-2">
                          {MANUAL_PHASES.map((phase) => (
                            <button
                              key={phase}
                              type="button"
                              disabled={!canEditControl}
                              onClick={() => setStatusControl((prev) => ({ ...prev, manualPhase: phase }))}
                              className={`rounded-lg border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.11em] transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                statusControl.manualPhase === phase
                                  ? 'border-gp-stateGreen/60 bg-gp-stateGreen/15 text-green-200'
                                  : 'border-white/15 bg-black/20 text-gp-textSoft hover:bg-white/10'
                              }`}
                            >
                              {OPERATIONAL_PHASE_LABEL[phase]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 h-px w-full bg-gradient-to-r from-gp-racingRed/80 via-gp-telemetryBlue/55 to-transparent" />
                </article>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {phaseConfig.map((phase, index) => {
                    const completed = status[phase.key];
                    const visualStatus = visualStatusByPhase[phase.key];
                    const statusLabel =
                      visualStatus === 'completed'
                        ? '🟢 COMPLETADO'
                        : visualStatus === 'in-progress'
                          ? '🟡 EN PROGRESO'
                          : '🔴 BLOQUEADO';

                    return (
                      <article
                        key={phase.key}
                        className={`relative overflow-hidden rounded-2xl border p-4 shadow-panel-deep backdrop-blur-xl transition-all duration-200 ${
                          visualStatus === 'completed'
                            ? 'border-gp-stateGreen/40 bg-[rgba(18,34,28,0.72)]'
                            : visualStatus === 'in-progress'
                              ? 'border-amber-300/35 bg-[rgba(39,33,18,0.68)]'
                              : 'border-gp-racingRed/35 bg-[rgba(38,18,20,0.7)]'
                        }`}
                      >
                        <span className="pointer-events-none absolute left-3 top-3 h-4 w-4 border-l border-t border-gp-telemetryBlue/45" />
                        <span className="pointer-events-none absolute right-3 top-3 h-4 w-4 border-r border-t border-gp-racingRed/45" />
                        <span className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 border-b border-l border-gp-racingRed/45" />
                        <span className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 border-b border-r border-gp-telemetryBlue/45" />

                        <div className="relative z-10">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Fase {String(index + 1).padStart(2, '0')}</p>
                          <h2 className="mt-1 text-xl font-semibold uppercase tracking-[0.12em] text-white">{phase.title}</h2>
                          <p className="mt-1 text-xs uppercase tracking-[0.11em] text-gp-textSoft">{phase.subtitle}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.11em] text-white/45">{phase.rule}</p>

                          <div className="mt-4 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">Estado</p>
                            <p
                              className={`mt-1 text-xs font-semibold uppercase tracking-[0.13em] ${
                                visualStatus === 'completed'
                                  ? 'text-green-300'
                                  : visualStatus === 'in-progress'
                                    ? 'text-amber-200'
                                    : 'text-red-300'
                              }`}
                            >
                              {statusLabel}
                            </p>
                          </div>

                          {!isHydrated ? (
                            <p className="mt-4 text-[10px] uppercase tracking-[0.12em] text-gp-textSoft">Sincronizando datos...</p>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function normalizeTeams(value: unknown): TeamRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (entry): entry is TeamRecord =>
        Boolean(entry) && typeof entry.id === 'string' && typeof entry.name === 'string' && Array.isArray(entry.members)
    )
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      members: Array.from(new Set(entry.members.filter((pilotId): pilotId is string => typeof pilotId === 'string')))
    }));
}

function normalizeStatusControl(value: unknown): EventStatusControl {
  if (!value || typeof value !== 'object') {
    return DEFAULT_STATUS_CONTROL;
  }

  const payload = value as Partial<EventStatusControl>;
  const mode: EventStatusMode = payload.mode === 'manual' ? 'manual' : 'automatic';
  const manualPhase = isOperationalPhase(payload.manualPhase) ? payload.manualPhase : DEFAULT_STATUS_CONTROL.manualPhase;

  return {
    mode,
    manualPhase
  };
}

function isOperationalPhase(value: unknown): value is EventOperationalPhase {
  return typeof value === 'string' && MANUAL_PHASES.includes(value as EventOperationalPhase);
}

function getCurrentMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function buildSessionWindows(
  sessions: Array<{ startTime: unknown; duration: unknown }>,
  phase: EventOperationalPhase
): TimeWindow[] {
  return sessions
    .map((session) => {
      const start = parseTimeToMinutes(session.startTime);
      const duration = toPositiveMinutes(session.duration);
      if (start === null || duration === null) {
        return null;
      }

      return {
        phase,
        start,
        end: Math.min(start + duration, 24 * 60)
      } satisfies TimeWindow;
    })
    .filter((window): window is TimeWindow => Boolean(window));
}

function buildRaceWindows(value: unknown): TimeWindow[] {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const payload = value as {
    config?: { raceIntervalMinutes?: unknown };
    races?: Array<{ startTime?: unknown }>;
  };

  const raceInterval = toPositiveMinutes(payload.config?.raceIntervalMinutes) ?? 20;
  const races = Array.isArray(payload.races) ? payload.races : [];

  return races
    .slice(0, 2)
    .map((race, index) => {
      const start = parseTimeToMinutes(race?.startTime);
      if (start === null) {
        return null;
      }

      return {
        phase: index === 0 ? 'carrera-1' : 'carrera-2',
        start,
        end: Math.min(start + raceInterval, 24 * 60)
      } satisfies TimeWindow;
    })
    .filter((window): window is TimeWindow => Boolean(window));
}

function parseTimeToMinutes(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }

  const clean = value.trim();
  if (!/^\d{2}:\d{2}$/.test(clean)) {
    return null;
  }

  const [hoursText, minutesText] = clean.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function toPositiveMinutes(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.floor(value);
}
