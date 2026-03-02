"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { useClassification } from '@/context/ClassificationContext';
import { usePilots } from '@/context/PilotsContext';
import { useTimeAttackSessions } from '@/context/TimeAttackContext';
import { loadModuleState } from '@/lib/eventStateClient';
import { buildCombinedStandings } from '@/lib/combinedStandings';
import { useEventInfo } from '@/lib/event-client';
import {
  EMPTY_RACE_RESULT,
  buildIndividualStandings,
  buildTeamStandings,
  normalizeRaceResult,
  type StoredResults,
  type TeamRecord
} from '@/lib/resultsEngine';

type EventPhaseState = {
  timeAttackCompleted: boolean;
  qualyCompleted: boolean;
  teamsGenerated: boolean;
  race1Completed: boolean;
  race2Completed: boolean;
  resultsFinalized: boolean;
  eventClosed: boolean;
};

type PhaseDefinition = {
  key: keyof EventPhaseState;
  nextAction: string;
};

const EMPTY_RESULTS: StoredResults = {
  race1: EMPTY_RACE_RESULT,
  race2: EMPTY_RACE_RESULT
};

const PHASES: PhaseDefinition[] = [
  { key: 'timeAttackCompleted', nextAction: 'Subir al menos 1 resultado de Time Attack.' },
  { key: 'qualyCompleted', nextAction: 'Completar tiempos de Qualy para todos los asignados.' },
  { key: 'teamsGenerated', nextAction: 'Generar los 10 equipos oficiales.' },
  { key: 'race1Completed', nextAction: 'Cargar resultados completos de Carrera 1.' },
  { key: 'race2Completed', nextAction: 'Cargar resultados completos de Carrera 2.' },
  { key: 'resultsFinalized', nextAction: 'Verificar que todos los pilotos tengan total de puntos.' },
  { key: 'eventClosed', nextAction: 'Cerrar evento con todas las fases validadas.' }
];

export default function AdminDashboardPage() {
  const { activeEventId, isHydrated: activeEventHydrated } = useActiveEvent();
  const eventInfo = useEventInfo(activeEventId);
  const { pilots, isHydrated: pilotsHydrated } = usePilots();
  const { sessions, isHydrated: timeAttackHydrated } = useTimeAttackSessions();
  const { qualySessions, qualyRecords, isHydrated: qualyHydrated } = useClassification();

  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [results, setResults] = useState<StoredResults>(EMPTY_RESULTS);
  const [isStorageHydrated, setIsStorageHydrated] = useState(false);

  useEffect(() => {
    if (!activeEventHydrated) {
      return;
    }

    setIsStorageHydrated(false);

    void (async () => {
      try {
        const [teamsPayload, parsedResults] = await Promise.all([
          loadModuleState<unknown>(activeEventId, 'teams', []),
          loadModuleState<Partial<StoredResults>>(activeEventId, 'results', EMPTY_RESULTS)
        ]);

        setTeams(normalizeTeams(teamsPayload));
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

  const isHydrated = pilotsHydrated && timeAttackHydrated && qualyHydrated && activeEventHydrated && isStorageHydrated;

  const combinedStandings = useMemo(
    () => buildCombinedStandings({ pilots, sessions, qualyRecords }),
    [pilots, sessions, qualyRecords]
  );

  const individualStandings = useMemo(() => buildIndividualStandings(results), [results]);
  const teamStandings = useMemo(() => buildTeamStandings(results, teams), [results, teams]);

  const race1PointsByPilot = useMemo(
    () => new Map(results.race1.entries.map((entry) => [entry.pilotId, entry.finalPoints] as const)),
    [results.race1.entries]
  );

  const race2PointsByPilot = useMemo(
    () => new Map(results.race2.entries.map((entry) => [entry.pilotId, entry.finalPoints] as const)),
    [results.race2.entries]
  );

  const assignedQualyPilotIds = useMemo(
    () => Array.from(new Set(qualySessions.flatMap((session) => session.assignedPilots))),
    [qualySessions]
  );

  const qualyTimesByPilot = useMemo(
    () =>
      new Map(
        qualyRecords
          .filter((record) => Number.isFinite(record.qualyTime) && (record.qualyTime ?? 0) > 0)
          .map((record) => [record.pilotId, record.qualyTime as number] as const)
      ),
    [qualyRecords]
  );

  const eventStatus = useMemo<EventPhaseState>(() => {
    const timeAttackCompleted = sessions.some((session) => session.times.length > 0);
    const qualyCompleted =
      assignedQualyPilotIds.length > 0 && assignedQualyPilotIds.every((pilotId) => qualyTimesByPilot.has(pilotId));
    const configuredTeams = eventInfo?.config?.teamsCount ?? 0;
    const expectedTeamMembers = configuredTeams > 0 ? Math.ceil(pilots.length / configuredTeams) : 0;
    const teamsGenerated =
      configuredTeams > 0 &&
      teams.length === configuredTeams &&
      teams.every((team) => team.members.length > 0 && team.members.length <= expectedTeamMembers);
    const race1Completed = pilots.length > 0 && pilots.every((pilot) => race1PointsByPilot.has(pilot.id));
    const race2Completed = pilots.length > 0 && pilots.every((pilot) => race2PointsByPilot.has(pilot.id));
    const resultsFinalized =
      pilots.length > 0 &&
      pilots.every((pilot) => {
        const race1 = race1PointsByPilot.get(pilot.id);
        const race2 = race2PointsByPilot.get(pilot.id);
        return typeof race1 === 'number' && typeof race2 === 'number' && race1 + race2 > 0;
      });

    return {
      timeAttackCompleted,
      qualyCompleted,
      teamsGenerated,
      race1Completed,
      race2Completed,
      resultsFinalized,
      eventClosed: timeAttackCompleted && qualyCompleted && teamsGenerated && race1Completed && race2Completed && resultsFinalized
    };
  }, [assignedQualyPilotIds, pilots, qualyTimesByPilot, race1PointsByPilot, race2PointsByPilot, sessions, teams, eventInfo]);

  const completedPhases = useMemo(() => PHASES.filter((phase) => eventStatus[phase.key]).length, [eventStatus]);
  const totalPhases = PHASES.length;
  const progressPercent = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

  const nextPendingAction = useMemo(() => {
    const pending = PHASES.find((phase) => !eventStatus[phase.key]);
    return pending ? pending.nextAction : 'Evento cerrado y sin acciones pendientes.';
  }, [eventStatus]);

  const bestTimeAttack = useMemo(() => {
    const values = sessions
      .flatMap((session) => session.times)
      .map((time) => time.correctedTime)
      .filter((time): time is number => Number.isFinite(time) && time > 0);

    if (values.length === 0) {
      return null;
    }

    return Math.min(...values);
  }, [sessions]);

  const polePosition = combinedStandings[0] ?? null;
  const teamLeader = teamStandings[0] ?? null;
  const topPilotsByPoints = individualStandings.slice(0, 3);
  const topTeams = teamStandings.slice(0, 3);

  const currentStatusLabel = eventStatus.eventClosed
    ? '🟢 CERRADO'
    : completedPhases > 0
      ? '🟡 EN PROGRESO'
      : '🔴 BLOQUEADO';

  const eventLocation = eventInfo?.location ?? '—';
  const eventName = eventInfo?.name ?? 'GP Pistón';
  const eventDate = eventInfo?.date ? formatEventDate(String(eventInfo.date)) : deriveEventDate(results);

  return (
    <main className="min-h-screen bg-gp-bg text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar activeItem="dashboard" />

        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(0,207,255,0.08),transparent_42%),radial-gradient(circle_at_85%_18%,rgba(225,6,0,0.08),transparent_40%),linear-gradient(to_bottom,#0A0F16,#0A0F16)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-size:11px_11px] [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />
          <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(to_bottom,rgba(184,194,212,0.1)_0,rgba(184,194,212,0.1)_1px,transparent_1px,transparent_44px)]" />

          <div className="relative z-10">
            <Header title="DASHBOARD" subtitle="Centro de control operativo GP Pistón" />

            <section className="px-5 py-6 sm:px-6">
              <div className="mx-auto grid max-w-7xl gap-5">
                <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                  <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">EVENTO</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <StatusField label="Nombre evento" value={eventName} emphasized />
                    <StatusField label="Fecha" value={eventDate} />
                    <StatusField label="Ubicación" value={eventLocation} />
                    <StatusField label="Estado actual" value={isHydrated ? currentStatusLabel : '—'} />
                  </div>
                </article>

                <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                  <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">PROGRESO GLOBAL</p>
                  <div className="mt-3 grid gap-4 lg:grid-cols-[auto,1fr] lg:items-center">
                    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-center">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">Fases completadas</p>
                      <p className="mt-1 text-2xl font-semibold text-white">
                        {isHydrated ? completedPhases : '—'} / {totalPhases}
                      </p>
                    </div>

                    <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">
                        <span>Avance operativo</span>
                        <span className="font-semibold text-white">{isHydrated ? `${progressPercent}%` : '—'}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-gp-racingRed via-gp-telemetryBlue to-gp-stateGreen transition-all duration-300"
                          style={{ width: `${isHydrated ? progressPercent : 0}%` }}
                        />
                      </div>
                      <p className="text-xs uppercase tracking-[0.12em] text-gp-textSoft">
                        Siguiente acción: <span className="text-white">{isHydrated ? nextPendingAction : '—'}</span>
                      </p>
                    </div>
                  </div>
                </article>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="Total pilotos registrados" value={isHydrated ? String(pilots.length) : '—'} />
                  <MetricCard
                    label="Mejor tiempo Time Attack"
                    value={isHydrated && typeof bestTimeAttack === 'number' ? `${bestTimeAttack.toFixed(3)} s` : '—'}
                  />
                  <MetricCard
                    label="Pole Position actual"
                    value={isHydrated && polePosition ? `#${String(polePosition.numeroPiloto).padStart(2, '0')} ${polePosition.fullName}` : '—'}
                  />
                  <MetricCard
                    label="Equipo líder actual"
                    value={isHydrated && teamLeader ? `${teamLeader.teamName} · ${teamLeader.totalPoints} pts` : '—'}
                  />
                </section>

                <section className="grid gap-4 xl:grid-cols-2">
                  <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                    <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">PREVIEW RANKING</p>
                    <h2 className="mt-2 text-xl font-semibold uppercase tracking-[0.13em] text-white">Top 3 pilotos por puntos</h2>
                    <div className="mt-3 h-px w-full bg-gradient-to-r from-gp-racingRed/70 via-gp-telemetryBlue/50 to-transparent" />

                    <div className="mt-3 space-y-2">
                      {isHydrated && topPilotsByPoints.length > 0 ? (
                        topPilotsByPoints.map((pilot, index) => (
                          <div key={pilot.pilotId} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white">
                              P{index + 1} · #{String(pilot.numeroPiloto).padStart(2, '0')} {pilot.fullName}
                            </p>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">{pilot.totalPoints} pts</p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-4 text-center text-xs uppercase tracking-[0.13em] text-gp-textSoft">
                          —
                        </div>
                      )}
                    </div>
                  </article>

                  <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                    <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">PREVIEW RANKING</p>
                    <h2 className="mt-2 text-xl font-semibold uppercase tracking-[0.13em] text-white">Top 3 equipos</h2>
                    <div className="mt-3 h-px w-full bg-gradient-to-r from-gp-racingRed/70 via-gp-telemetryBlue/50 to-transparent" />

                    <div className="mt-3 space-y-2">
                      {isHydrated && topTeams.length > 0 ? (
                        topTeams.map((team, index) => (
                          <div key={team.teamId} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white">
                              P{index + 1} · {team.teamName}
                            </p>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">{team.totalPoints} pts</p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-4 text-center text-xs uppercase tracking-[0.13em] text-gp-textSoft">
                          —
                        </div>
                      )}
                    </div>
                  </article>
                </section>

                <section className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                  <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">ACCESOS RÁPIDOS</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <QuickAccess href={`/admin/events/${activeEventId}/results/editor`} label="Editor de Resultados" />
                    <QuickAccess href={`/admin/events/${activeEventId}/results/standings`} label="Clasificación de Resultados" />
                    <QuickAccess href={`/admin/events/${activeEventId}/races`} label="Carreras" />
                    <QuickAccess href={`/admin/events/${activeEventId}/event-status`} label="Estado del Evento" />
                  </div>
                </section>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-4 shadow-panel-deep backdrop-blur-xl">
      <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">{label}</p>
      <p className="mt-2 text-lg font-semibold uppercase tracking-[0.08em] text-white">{value}</p>
    </article>
  );
}

function StatusField({ label, value, emphasized }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">{label}</p>
      <p className={`mt-1 ${emphasized ? 'text-xl' : 'text-lg'} font-semibold uppercase tracking-[0.08em] text-white`}>{value}</p>
    </div>
  );
}

function QuickAccess({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[84px] items-center justify-center rounded-xl border border-gp-telemetryBlue/40 bg-gp-telemetryBlue/10 px-4 py-4 text-center text-sm font-semibold uppercase tracking-[0.12em] text-cyan-200 transition-all duration-200 hover:border-gp-telemetryBlue/70 hover:bg-gp-telemetryBlue/20 hover:text-white"
    >
      {label}
    </Link>
  );
}

function deriveEventDate(results: StoredResults) {
  const timestamps = [results.race1.calculatedAt, results.race2.calculatedAt]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value));

  const target = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date();
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }).format(target);
}

function formatEventDate(value: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(parsed));
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
