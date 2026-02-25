'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { useClassification } from '@/context/ClassificationContext';
import { usePilots } from '@/context/PilotsContext';
import { useTimeAttackSessions } from '@/context/TimeAttackContext';
import { getEventRuntimeConfig, loadEventStorageItem } from '@/lib/eventStorage';
import { EMPTY_RACE_RESULT, normalizeRaceResult, type StoredResults, type TeamRecord } from '@/lib/resultsEngine';

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

const TEAMS_STORAGE_KEY = 'teams';
const RESULTS_STORAGE_KEY = 'results';

const EMPTY_RESULTS: StoredResults = {
  race1: EMPTY_RACE_RESULT,
  race2: EMPTY_RACE_RESULT
};

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
  const { pilots, isHydrated: pilotsHydrated } = usePilots();
  const { sessions, isHydrated: timeAttackHydrated } = useTimeAttackSessions();
  const { qualySessions, qualyRecords, isHydrated: qualyHydrated } = useClassification();

  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [results, setResults] = useState<StoredResults>(EMPTY_RESULTS);
  const [isStorageHydrated, setIsStorageHydrated] = useState(false);

  const eventConfig = useMemo(() => getEventRuntimeConfig(activeEventId), [activeEventId]);

  useEffect(() => {
    if (!activeEventHydrated) {
      return;
    }

    setIsStorageHydrated(false);

    try {
      const rawTeams = loadEventStorageItem(TEAMS_STORAGE_KEY, activeEventId);
      if (rawTeams) {
        const parsedTeams = JSON.parse(rawTeams) as unknown;
        setTeams(normalizeTeams(parsedTeams));
      } else {
        setTeams([]);
      }

      const rawResults = loadEventStorageItem(RESULTS_STORAGE_KEY, activeEventId);
      if (rawResults) {
        const parsedResults = JSON.parse(rawResults) as Partial<StoredResults>;
        setResults({
          race1: normalizeRaceResult(parsedResults?.race1),
          race2: normalizeRaceResult(parsedResults?.race2)
        });
      } else {
        setResults(EMPTY_RESULTS);
      }
    } catch {
      setTeams([]);
      setResults(EMPTY_RESULTS);
    } finally {
      setIsStorageHydrated(true);
    }
  }, [activeEventHydrated, activeEventId]);

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
      teams.length === eventConfig.teamsCount &&
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
  }, [assignedQualyPilotIds, pilots, qualyTimesByPilot, race1PointsByPilot, race2PointsByPilot, sessions, teams, eventConfig.teamsCount]);

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
                      <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">Estado operativo</p>
                      <p className="mt-1 text-lg font-semibold text-cyan-200">{status.eventClosed ? 'Evento cerrado' : 'En progreso'}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">Fuente de estado</p>
                      <p className="mt-1 text-lg font-semibold text-white">Cálculo automático</p>
                    </div>
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
