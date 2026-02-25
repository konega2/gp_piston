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
import { buildCombinedStandings } from '@/lib/combinedStandings';
import type { PilotRecord } from '@/data/pilots';
import { useEventRuntimeConfig } from '@/lib/event-client';

type TeamRecord = {
  id: string;
  name: string;
  members: string[];
};

export default function TeamsPage() {
  const { activeEventId, isHydrated: activeEventHydrated } = useActiveEvent();
  const runtimeConfig = useEventRuntimeConfig(activeEventId);
  const { pilots, isHydrated: pilotsHydrated } = usePilots();
  const { sessions } = useTimeAttackSessions();
  const { qualyRecords } = useClassification();

  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [isTeamsHydrated, setIsTeamsHydrated] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<'auto' | 'manual'>('auto');
  const [draftTeams, setDraftTeams] = useState<TeamRecord[]>([]);
  const [draggedPilotId, setDraggedPilotId] = useState<string | null>(null);

  const isHydrated = pilotsHydrated && activeEventHydrated;

  const configuredTeamsCount = useMemo(() => {
    const count = runtimeConfig?.teamsCount ?? 0;
    return Number.isFinite(count) && count > 0 ? count : 0;
  }, [runtimeConfig]);

  const pilotsById = useMemo(() => new Map(pilots.map((pilot) => [pilot.id, pilot])), [pilots]);
  const combinedStandings = useMemo(
    () => buildCombinedStandings({ pilots, sessions, qualyRecords }),
    [pilots, sessions, qualyRecords]
  );

  const orderedPilots = useMemo(() => {
    if (combinedStandings.length > 0) {
      return combinedStandings
        .map((row) => pilotsById.get(row.pilotId))
        .filter((pilot): pilot is PilotRecord => Boolean(pilot));
    }

    return [...pilots].sort((a, b) => a.numeroPiloto - b.numeroPiloto);
  }, [combinedStandings, pilots, pilotsById]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    setIsTeamsHydrated(false);

    void (async () => {
      try {
        const parsed = await loadModuleState<TeamRecord[]>(activeEventId, 'teams', []);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          setTeams(createTeamPlaceholders(configuredTeamsCount));
          return;
        }

        const normalized = parsed
          .filter(
            (entry): entry is TeamRecord =>
              Boolean(entry) && typeof entry.id === 'string' && typeof entry.name === 'string' && Array.isArray(entry.members)
          )
          .map((entry) => ({
            id: entry.id,
            name: entry.name,
            members: Array.from(new Set(entry.members.filter((pilotId): pilotId is string => typeof pilotId === 'string')))
          }));

        setTeams(normalized.length > 0 ? normalized : createTeamPlaceholders(configuredTeamsCount));
      } catch {
        setTeams(createTeamPlaceholders(configuredTeamsCount));
      } finally {
        setIsTeamsHydrated(true);
      }
    })();
  }, [isHydrated, activeEventId, configuredTeamsCount]);

  useEffect(() => {
    if (!isTeamsHydrated) {
      return;
    }

    void saveModuleState(activeEventId, 'teams', teams);
  }, [isTeamsHydrated, teams, activeEventId]);

  const handleGenerateTeamsAuto = () => {
    setTeams(buildTeamsByPattern(orderedPilots, configuredTeamsCount));
    setFeedback('Equipos generados correctamente con los pilotos disponibles.');
  };

  const handleUndoTeams = () => {
    setTeams([]);
    setFeedback('Equipos eliminados. Estado reseteado.');
  };

  const resetDraftTeams = () => {
    setDraftTeams(createTeamPlaceholders(configuredTeamsCount));
  };

  const movePilotToTeam = (pilotId: string, teamId: string | null) => {
    setDraftTeams((prev) =>
      prev.map((team) => {
        const nextMembers = team.members.filter((id) => id !== pilotId);
        if (teamId && team.id === teamId && !nextMembers.includes(pilotId)) {
          nextMembers.push(pilotId);
        }
        return {
          ...team,
          members: nextMembers
        };
      })
    );
  };

  const unassignedPilots = useMemo(() => {
    const assigned = new Set(draftTeams.flatMap((team) => team.members));
    return pilots.filter((pilot) => !assigned.has(pilot.id));
  }, [draftTeams, pilots]);

  const handleApplyAssignments = () => {
    if (assignMode === 'auto') {
      handleGenerateTeamsAuto();
    } else {
      setTeams(draftTeams);
      setFeedback('Equipos actualizados manualmente.');
    }

    setIsAssignOpen(false);
  };

  const handleOpenAssign = () => {
    setAssignMode('auto');
    resetDraftTeams();
    setDraggedPilotId(null);
    setIsAssignOpen(true);
  };

  return (
    <main className="min-h-screen bg-gp-bg text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar activeItem="teams" />

        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(0,207,255,0.09),transparent_42%),radial-gradient(circle_at_85%_18%,rgba(225,6,0,0.08),transparent_40%),linear-gradient(to_bottom,#0A0F16,#0A0F16)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-size:11px_11px] [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />

          <div className="relative z-10">
            <Header title="TEAMS" subtitle="Organización oficial de equipos GP Pistón Valencia" />

            <section className="px-5 py-6 sm:px-6">
              <div className="mx-auto max-w-7xl space-y-5">
                <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">MÓDULO OPERATIVO</p>
                      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.14em] text-white">GENERADOR DE EQUIPOS</h1>
                    </div>

                    <Link
                      href={`/admin/events/${activeEventId}/classification/standings`}
                      className="inline-flex items-center gap-2 rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition-colors duration-200 hover:bg-gp-telemetryBlue/20"
                    >
                      <span aria-hidden>←</span>
                      Ver clasificación conjunta
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">Pilotos disponibles</p>
                      <p className="mt-1 text-lg font-semibold text-white">{pilots.length}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">Pilotos para equipos</p>
                      <p className="mt-1 text-lg font-semibold text-white">{pilots.length}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">Equipos generados</p>
                      <p className="mt-1 text-lg font-semibold text-white">{teams.length}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenAssign}
                        disabled={!isHydrated}
                        className="rounded-xl border border-gp-racingRed/55 bg-gp-racingRed/[0.18] px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-red-100 transition-all duration-200 hover:bg-gp-racingRed/[0.28] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Generar Equipos
                      </button>

                      <button
                        type="button"
                        onClick={handleUndoTeams}
                        disabled={!isHydrated || teams.length === 0}
                        className="rounded-xl border border-white/20 bg-white/[0.06] px-5 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-gp-textSoft transition-all duration-200 hover:border-gp-telemetryBlue/45 hover:bg-gp-telemetryBlue/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Deshacer Equipos
                      </button>
                    </div>

                    {feedback ? (
                      <div className="rounded-lg border border-gp-stateGreen/45 bg-gp-stateGreen/10 px-3 py-2 text-xs uppercase tracking-[0.13em] text-green-200">
                        {feedback}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 h-px w-full bg-gradient-to-r from-gp-racingRed/80 via-gp-telemetryBlue/55 to-transparent" />
                </article>

                {!isHydrated || !isTeamsHydrated ? (
                  <div className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.7)] px-5 py-10 text-center text-sm uppercase tracking-[0.14em] text-gp-textSoft">
                    Cargando generador de equipos...
                  </div>
                ) : teams.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.7)] px-5 py-10 text-center text-sm uppercase tracking-[0.14em] text-gp-textSoft">
                    Sin equipos generados todavía.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {teams.map((team) => (
                      <article
                        key={team.id}
                        className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-4 shadow-panel-deep backdrop-blur-xl"
                      >
                        <h2 className="text-xl font-semibold uppercase tracking-[0.13em] text-white">{team.name}</h2>
                        <div className="mt-2 h-px w-full bg-gradient-to-r from-gp-racingRed/70 via-gp-telemetryBlue/50 to-transparent" />

                        <div className="mt-3 space-y-2">
                          {team.members.map((pilotId) => {
                            const pilot = pilotsById.get(pilotId);
                            if (!pilot) {
                              return null;
                            }

                            return (
                              <div
                                key={`${team.id}-${pilotId}`}
                                className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
                              >
                                <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">Piloto</p>
                                <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
                                  #{String(pilot.numeroPiloto).padStart(2, '0')}
                                </p>
                                <p className="mt-0.5 text-sm font-medium uppercase tracking-[0.08em] text-white">
                                  {pilot.nombre} {pilot.apellidos}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {isAssignOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsAssignOpen(false)}
            aria-label="Cerrar panel de equipos"
          />
          <div className="relative w-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-[rgba(10,15,22,0.94)] shadow-panel-deep">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-gp-textSoft">Generador de equipos</p>
                <h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.14em] text-white">Selecciona modo</h2>
                <p className="mt-2 text-sm text-gp-textSoft">Elige generar automaticamente o asignar manualmente.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignOpen(false)}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-gp-textSoft transition-colors hover:border-white/20 hover:text-white"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {[
                  { key: 'auto', title: 'Automatico', desc: 'Distribucion balanceada con todos los pilotos.' },
                  { key: 'manual', title: 'Manual', desc: 'Asigna pilotos por drag & drop o selector.' }
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setAssignMode(option.key as 'auto' | 'manual')}
                    className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
                      assignMode === option.key
                        ? 'border-gp-racingRed/55 bg-[rgba(34,18,22,0.78)]'
                        : 'border-white/10 bg-[rgba(17,24,38,0.65)] hover:-translate-y-0.5 hover:border-gp-telemetryBlue/40'
                    }`}
                  >
                    <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white">{option.title}</h3>
                    <p className="mt-2 text-xs uppercase tracking-[0.12em] text-gp-textSoft">{option.desc}</p>
                  </button>
                ))}
              </div>

              {assignMode === 'manual' ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr,2fr]">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.13em] text-gp-textSoft">Sin equipo</p>
                    <div
                      className="min-h-[260px] rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.65)] p-3"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (draggedPilotId) {
                          movePilotToTeam(draggedPilotId, null);
                          setDraggedPilotId(null);
                        }
                      }}
                    >
                      <div className="space-y-2">
                        {unassignedPilots.map((pilot) => (
                          <div
                            key={pilot.id}
                            draggable
                            onDragStart={() => setDraggedPilotId(pilot.id)}
                            className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
                          >
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
                                #{String(pilot.numeroPiloto).padStart(2, '0')}
                              </p>
                              <p className="text-[11px] uppercase tracking-[0.08em] text-white">
                                {pilot.nombre} {pilot.apellidos}
                              </p>
                            </div>
                            <select
                              value=""
                              onChange={(event) => {
                                const target = event.target.value;
                                movePilotToTeam(pilot.id, target === '' ? null : target);
                              }}
                              className="rounded-md border border-white/10 bg-[rgba(10,15,22,0.6)] px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-gp-textSoft"
                            >
                              <option value="">Sin equipo</option>
                              {draftTeams.map((team) => (
                                <option key={team.id} value={team.id}>
                                  {team.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {draftTeams.map((team) => (
                      <div
                        key={team.id}
                        className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-3"
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (draggedPilotId) {
                            movePilotToTeam(draggedPilotId, team.id);
                            setDraggedPilotId(null);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-white">{team.name}</h3>
                          <span className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">
                            {team.members.length} pilotos
                          </span>
                        </div>
                        <div className="mt-3 space-y-2">
                          {team.members.map((pilotId) => {
                            const pilot = pilotsById.get(pilotId);
                            if (!pilot) {
                              return null;
                            }

                            return (
                              <div
                                key={`${team.id}-${pilotId}`}
                                draggable
                                onDragStart={() => setDraggedPilotId(pilotId)}
                                className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
                              >
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
                                    #{String(pilot.numeroPiloto).padStart(2, '0')}
                                  </p>
                                  <p className="text-[11px] uppercase tracking-[0.08em] text-white">
                                    {pilot.nombre} {pilot.apellidos}
                                  </p>
                                </div>
                                <select
                                  value={team.id}
                                  onChange={(event) => {
                                    const target = event.target.value;
                                    movePilotToTeam(pilot.id, target === '' ? null : target);
                                  }}
                                  className="rounded-md border border-white/10 bg-[rgba(10,15,22,0.6)] px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-gp-textSoft"
                                >
                                  <option value="">Sin equipo</option>
                                  {draftTeams.map((optionTeam) => (
                                    <option key={optionTeam.id} value={optionTeam.id}>
                                      {optionTeam.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsAssignOpen(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-gp-textSoft transition-colors hover:border-white/20 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyAssignments}
                className="rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/15 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition-colors duration-200 hover:bg-gp-telemetryBlue/25"
              >
                Aplicar asignacion
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function createTeamPlaceholders(count: number): TeamRecord[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `team-${index + 1}`,
    name: `Equipo ${index + 1}`,
    members: [] as string[]
  }));
}

function buildTeamsByPattern(orderedPilots: PilotRecord[], teamsCount: number): TeamRecord[] {
  const safeTeamsCount = Math.max(teamsCount, 1);
  const teams: TeamRecord[] = createTeamPlaceholders(safeTeamsCount).map((team): TeamRecord => ({
    ...team,
    members: []
  }));

  const total = orderedPilots.length;
  const groupSize = Math.ceil(total / 2);
  const group1 = orderedPilots.slice(0, groupSize);
  const group2 = orderedPilots.slice(groupSize);
  const group1Size = group1.length;
  const group2Size = group2.length;
  const patternTeams = Math.min(safeTeamsCount, Math.floor(groupSize / 4));

  for (let index = 0; index < patternTeams; index += 1) {
    const frontStart = 1 + index * 2;
    const backStart1 = group1Size - index * 2;
    const backStart2 = group2Size - index * 2;
    const positionsGroup1 = [frontStart, frontStart + 1, backStart1 - 1, backStart1];
    const positionsGroup2 = [frontStart, frontStart + 1, backStart2 - 1, backStart2];
    const team = teams[index];

    positionsGroup1.forEach((position) => {
      const pilot = group1[position - 1];
      if (pilot && !team.members.includes(pilot.id)) {
        team.members.push(pilot.id);
      }
    });

    positionsGroup2.forEach((position) => {
      const pilot = group2[position - 1];
      if (pilot && !team.members.includes(pilot.id)) {
        team.members.push(pilot.id);
      }
    });
  }

  const used = new Set(teams.flatMap((team) => team.members));
  const remaining = orderedPilots.filter((pilot) => !used.has(pilot.id));

  remaining.forEach((pilot, index) => {
    const team = teams[index % teams.length];
    if (team && !team.members.includes(pilot.id)) {
      team.members.push(pilot.id);
    }
  });

  return teams;
}
