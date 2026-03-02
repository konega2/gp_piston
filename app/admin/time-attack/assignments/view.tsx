'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { usePilots } from '@/context/PilotsContext';
import { useTimeAttackSessions } from '@/context/TimeAttackContext';

export default function TimeAttackAssignmentsPage() {
  const { activeEventId } = useActiveEvent();
  const { pilots } = usePilots();
  const { sessions, isHydrated, togglePilotAssignment } = useTimeAttackSessions();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPilotId, setSelectedPilotId] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState('');

  const selectedPilot = pilots.find((pilot) => pilot.id === selectedPilotId) ?? null;

  const eligiblePilots = useMemo(() => pilots.filter((pilot) => pilot.hasTimeAttack), [pilots]);

  const filteredPilots = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    return eligiblePilots.filter((pilot) => {
      const name = `${pilot.nombre} ${pilot.apellidos}`.toLowerCase();
      return normalized.length === 0 || name.includes(normalized);
    });
  }, [eligiblePilots, searchTerm]);

  useEffect(() => {
    if (selectedPilotId && !eligiblePilots.some((pilot) => pilot.id === selectedPilotId)) {
      setSelectedPilotId(null);
    }
  }, [eligiblePilots, selectedPilotId]);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    [sessions]
  );

  const firstSession = sortedSessions[0]?.name ?? 'T1';
  const lastSession = sortedSessions[sortedSessions.length - 1]?.name ?? 'T1';

  const handleToggleSession = (sessionId: string) => {
    if (!selectedPilotId) {
      return;
    }

    const result = togglePilotAssignment(sessionId, selectedPilotId);
    if (!result.ok) {
      if (result.reason === 'closed') {
        setAssignmentError('No se puede asignar: sesión cerrada.');
        return;
      }

      if (result.reason === 'full') {
        setAssignmentError('No se puede asignar: sesión completa.');
        return;
      }

      setAssignmentError('No fue posible actualizar la asignación.');
      return;
    }

    setAssignmentError('');
  };

  return (
    <main className="min-h-screen bg-gp-bg text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar activeItem="time-attack" />

        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(0,207,255,0.09),transparent_42%),radial-gradient(circle_at_85%_18%,rgba(225,6,0,0.08),transparent_40%),linear-gradient(to_bottom,#0A0F16,#0A0F16)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-size:11px_11px] [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />

          <div className="relative z-10">
            <Header title="TIME ATTACK" subtitle="Gestión de entrenamientos y tiempos oficiales" />

            <section className="px-5 py-6 sm:px-6">
              <div className="mx-auto max-w-7xl space-y-5">
                <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">MÓDULO OPERATIVO</p>
                      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.14em] text-white">ASIGNACIONES</h1>
                    </div>

                    <Link
                      href={`/admin/events/${activeEventId}/time-attack`}
                      className="inline-flex items-center gap-2 rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition-colors duration-200 hover:bg-gp-telemetryBlue/20"
                    >
                      <span aria-hidden>←</span>
                      Volver a Time Attack
                    </Link>
                  </div>

                  <div className="mt-4 h-px w-full bg-gradient-to-r from-gp-racingRed/80 via-gp-telemetryBlue/55 to-transparent" />
                </article>

                {!isHydrated ? (
                  <div className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.7)] px-5 py-10 text-center text-sm uppercase tracking-[0.14em] text-gp-textSoft">
                    Cargando datos de asignaciones...
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
                      <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-4 shadow-panel-deep backdrop-blur-xl">
                        <p className="text-xs uppercase tracking-[0.14em] text-gp-textSoft">Pilotos con Time Attack</p>
                        <input
                          value={searchTerm}
                          onChange={(event) => setSearchTerm(event.target.value)}
                          placeholder="Buscar piloto por nombre..."
                          className="mt-3 h-11 w-full rounded-lg border border-white/15 bg-[#0E141F] px-3 text-sm text-white outline-none transition-all duration-200 placeholder:text-gp-textSoft/60 focus:border-gp-racingRed/65 focus:shadow-input-red"
                        />

                        <div className="mt-4 max-h-[420px] space-y-2 overflow-auto pr-1">
                          {filteredPilots.map((pilot) => {
                            const fullName = `${pilot.nombre} ${pilot.apellidos}`;
                            const selected = selectedPilotId === pilot.id;

                            return (
                              <button
                                key={pilot.id}
                                type="button"
                                onClick={() => {
                                  setSelectedPilotId(pilot.id);
                                  setAssignmentError('');
                                }}
                                className={`w-full rounded-lg border px-3 py-2 text-left transition-all duration-200 ${
                                  selected
                                    ? 'border-gp-telemetryBlue/55 bg-gp-telemetryBlue/15 text-white'
                                    : 'border-white/10 bg-white/[0.02] text-gp-textSoft hover:border-gp-telemetryBlue/40 hover:text-white'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-medium uppercase tracking-[0.1em]">{fullName}</p>
                                  <span className="text-xs uppercase tracking-[0.12em] text-gp-textSoft">
                                    #{String(pilot.numeroPiloto).padStart(2, '0')}
                                  </span>
                                </div>
                              </button>
                            );
                          })}

                          {filteredPilots.length === 0 ? (
                            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-6 text-center text-xs uppercase tracking-[0.14em] text-gp-textSoft">
                              No hay pilotos contratados para Time Attack.
                            </div>
                          ) : null}
                        </div>
                      </article>

                      <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-4 shadow-panel-deep backdrop-blur-xl">
                        <p className="text-xs uppercase tracking-[0.14em] text-gp-textSoft">Sesiones {firstSession} — {lastSession}</p>
                        <div className="mt-4 space-y-3">
                          {sortedSessions.map((session) => {
                            const assignedCount = session.assignedPilots.length;
                            const occupancyPercent = Math.min((assignedCount / session.maxCapacity) * 100, 100);
                            const isClosed = session.status === 'closed';
                            const isFull = assignedCount >= session.maxCapacity;

                            return (
                              <div
                                key={session.id}
                                className={`relative rounded-xl border px-4 py-3 transition-all duration-200 ${
                                  isClosed
                                    ? 'border-gp-racingRed/40 bg-[rgba(34,18,22,0.72)]'
                                    : 'border-white/10 bg-white/[0.02]'
                                }`}
                              >
                                {isClosed ? <div className="absolute inset-0 rounded-xl bg-black/35" /> : null}
                                <div className="relative z-10">
                                  <div className="flex items-center justify-between">
                                    <p className="text-lg font-semibold uppercase tracking-[0.12em] text-white">
                                      {session.name} — {session.startTime}
                                    </p>
                                    <p className="text-xs uppercase tracking-[0.12em] text-gp-textSoft">
                                      {assignedCount} / {session.maxCapacity}
                                    </p>
                                  </div>

                                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${
                                        isFull ? 'bg-gp-racingRed/75' : 'bg-gp-telemetryBlue/75'
                                      }`}
                                      style={{ width: `${occupancyPercent}%` }}
                                    />
                                  </div>

                                  <p
                                    className={`mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                                      isClosed ? 'text-red-200' : 'text-cyan-200'
                                    }`}
                                  >
                                    {isClosed ? 'CERRADA' : isFull ? 'LLENA' : 'PENDIENTE'}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    </div>

                    <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                      <p className="text-xs uppercase tracking-[0.14em] text-gp-textSoft">Asignación por piloto</p>
                      <h2 className="mt-2 text-xl font-semibold uppercase tracking-[0.12em] text-white">
                        {selectedPilot
                          ? `${selectedPilot.nombre} ${selectedPilot.apellidos}`
                          : 'Selecciona un piloto para asignar sesiones'}
                      </h2>

                      {assignmentError ? (
                        <div className="mt-3 rounded-lg border border-gp-racingRed/45 bg-gp-racingRed/10 px-3 py-2 text-xs uppercase tracking-[0.13em] text-red-200">
                          {assignmentError}
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {sortedSessions.map((session) => {
                          const active = selectedPilot ? session.assignedPilots.includes(selectedPilot.id) : false;
                          const isClosed = session.status === 'closed';
                          const isFull = session.assignedPilots.length >= session.maxCapacity;
                          const disabled = !selectedPilot || (isClosed && !active) || (isFull && !active);

                          return (
                            <button
                              key={session.id}
                              type="button"
                              disabled={disabled}
                              onClick={() => handleToggleSession(session.id)}
                              className={`rounded-lg border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-200 ${
                                active
                                  ? 'border-gp-racingRed/70 bg-gp-racingRed/15 text-white shadow-[0_0_14px_rgba(225,6,0,0.25)]'
                                  : 'border-white/15 bg-white/[0.02] text-gp-textSoft hover:border-gp-telemetryBlue/45 hover:bg-gp-telemetryBlue/[0.08] hover:text-white'
                              } disabled:cursor-not-allowed disabled:opacity-45`}
                            >
                              {session.name} — {session.startTime}
                            </button>
                          );
                        })}
                      </div>
                    </article>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
