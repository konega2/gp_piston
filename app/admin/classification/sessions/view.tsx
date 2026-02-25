'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { getQualySessionTimeRange, useClassification } from '@/context/ClassificationContext';
import { usePilots } from '@/context/PilotsContext';
import { useEventName } from '@/lib/event-client';

export default function ClassificationSessionsPage() {
  const { activeEventId, isHydrated: activeEventHydrated } = useActiveEvent();
  const eventNameFromDb = useEventName(activeEventId);
  const {
    qualySessions,
    isHydrated,
    assignQualyByLevel,
    assignQualyByKart,
    assignQualyRandom,
    applyManualQualyAssignments,
    resetQualyAssignments
  } = useClassification();
  const { pilots } = usePilots();
  const eventName = activeEventHydrated ? eventNameFromDb ?? 'Evento' : 'Evento';
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<'levels' | 'karts' | 'random' | 'manual'>('levels');
  const [manualSessionId, setManualSessionId] = useState<string | null>(null);
  const [manualAssignments, setManualAssignments] = useState<Record<string, string[]>>({});

  const selectedSession = useMemo(
    () => qualySessions.find((session) => session.id === selectedSessionId) ?? null,
    [qualySessions, selectedSessionId]
  );

  const manualSession = useMemo(
    () => qualySessions.find((session) => session.id === manualSessionId) ?? qualySessions[0] ?? null,
    [qualySessions, manualSessionId]
  );

  const firstSession = qualySessions[0]?.name ?? 'Q1';
  const lastSession = qualySessions[qualySessions.length - 1]?.name ?? 'Q1';

  const selectedSessionPilots = useMemo(() => {
    if (!selectedSession) {
      return [];
    }

    return selectedSession.assignedPilots
      .map((pilotId) => {
        const pilot = pilots.find((item) => item.id === pilotId);
        if (!pilot) {
          return null;
        }

        const time = selectedSession.times.find((entry) => entry.pilotId === pilotId);

        return {
          pilot,
          qualyTime: time?.qualyTime ?? null
        };
      })
      .filter((entry): entry is { pilot: (typeof pilots)[number]; qualyTime: number | null } => Boolean(entry))
      .sort((a, b) => a.pilot.numeroPiloto - b.pilot.numeroPiloto);
  }, [pilots, selectedSession]);

  const eligiblePilots = useMemo(() => [...pilots].sort((a, b) => a.numeroPiloto - b.numeroPiloto), [pilots]);

  const manualPilotToSession = useMemo(() => {
    const map = new Map<string, string>();
    qualySessions.forEach((session) => {
      const list = manualAssignments[session.id] ?? session.assignedPilots;
      list.forEach((pilotId) => {
        if (!map.has(pilotId)) {
          map.set(pilotId, session.name);
        }
      });
    });
    return map;
  }, [manualAssignments, qualySessions]);

  const handleSessionClick = (sessionId: string) => {
    setSelectedSessionId((prev) => (prev === sessionId ? null : sessionId));
  };

  const handleManualToggle = (pilotId: string) => {
    if (!manualSession) {
      return;
    }

    setManualAssignments((prev) => {
      const next: Record<string, string[]> = { ...prev };
      const current = new Set(next[manualSession.id] ?? []);

      if (current.has(pilotId)) {
        current.delete(pilotId);
      } else {
        Object.keys(next).forEach((sessionId) => {
          if (sessionId !== manualSession.id) {
            next[sessionId] = next[sessionId].filter((id) => id !== pilotId);
          }
        });
        current.add(pilotId);
      }

      next[manualSession.id] = Array.from(current);
      return next;
    });
  };

  const handleApplyAssignments = () => {
    if (assignMode === 'levels') {
      assignQualyByLevel();
    } else if (assignMode === 'karts') {
      assignQualyByKart();
    } else if (assignMode === 'random') {
      assignQualyRandom();
    } else if (assignMode === 'manual') {
      applyManualQualyAssignments(manualAssignments);
    }

    setIsAssignOpen(false);
  };

  useEffect(() => {
    if (!isAssignOpen) {
      return;
    }

    const initialAssignments = qualySessions.reduce<Record<string, string[]>>((acc, session) => {
      acc[session.id] = [...session.assignedPilots];
      return acc;
    }, {});

    setManualAssignments(initialAssignments);
    setManualSessionId((prev) => prev ?? qualySessions[0]?.id ?? null);
  }, [isAssignOpen, qualySessions]);

  return (
    <main className="min-h-screen bg-gp-bg text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar activeItem="classification" />

        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(0,207,255,0.09),transparent_42%),radial-gradient(circle_at_85%_18%,rgba(225,6,0,0.08),transparent_40%),linear-gradient(to_bottom,#0A0F16,#0A0F16)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-size:11px_11px] [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />

          <div className="relative z-10">
            <Header title="CLASSIFICATION" subtitle="Gestión operativa de clasificación oficial" />

            <section className="px-5 py-6 sm:px-6">
              <div className="mx-auto max-w-7xl space-y-5">
                <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">{eventName.toUpperCase()} · CONFIGURACIÓN CERRADA</p>
                      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.14em] text-white">Sesiones Oficiales Qualy {firstSession} — {lastSession}</h1>
                      <p className="mt-2 text-sm text-gp-textSoft">Las sesiones son fijas y no admiten creación o borrado manual.</p>
                    </div>

                    <Link
                      href={`/admin/events/${activeEventId}/classification`}
                      className="inline-flex items-center gap-2 rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition-colors duration-200 hover:bg-gp-telemetryBlue/20"
                    >
                      <span aria-hidden>←</span>
                      Volver a Classification
                    </Link>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-[0.13em] text-gp-textSoft">Evento cerrado · asignación automática</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAssignOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-gp-racingRed/45 bg-gp-racingRed/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-red-200 transition-colors duration-200 hover:bg-gp-racingRed/20"
                      >
                        Asignar pilotos a Qualy
                      </button>
                      <button
                        type="button"
                        onClick={resetQualyAssignments}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-gp-textSoft transition-colors duration-200 hover:border-gp-telemetryBlue/40 hover:text-cyan-200"
                      >
                        Deshacer asignación
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 h-px w-full bg-gradient-to-r from-gp-racingRed/80 via-gp-telemetryBlue/55 to-transparent" />
                </article>

                {!isHydrated ? (
                  <div className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.7)] px-5 py-10 text-center text-sm uppercase tracking-[0.14em] text-gp-textSoft">
                    Cargando sesiones Qualy del evento...
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {qualySessions.map((session) => {
                        const isCompleted = session.status === 'completed';
                        const timeRange = getQualySessionTimeRange(session.startTime, session.duration);
                        const isSelected = selectedSessionId === session.id;

                        return (
                          <button
                            key={session.id}
                            type="button"
                            onClick={() => handleSessionClick(session.id)}
                            className={`relative overflow-hidden rounded-2xl border p-5 text-left shadow-panel-deep backdrop-blur-xl transition-all duration-300 ${
                              isSelected
                                ? 'scale-[1.01] border-gp-racingRed/55 bg-[rgba(30,20,26,0.78)]'
                                : isCompleted
                                  ? 'border-gp-stateGreen/40 bg-[rgba(18,34,28,0.72)] hover:-translate-y-0.5'
                                  : 'border-gp-telemetryBlue/30 bg-[rgba(17,24,38,0.72)] hover:-translate-y-0.5'
                            }`}
                          >
                            <span className="pointer-events-none absolute left-3 top-3 h-4 w-4 border-l border-t border-gp-telemetryBlue/45" />
                            <span className="pointer-events-none absolute right-3 top-3 h-4 w-4 border-r border-t border-gp-racingRed/45" />
                            <span className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 border-b border-l border-gp-racingRed/45" />
                            <span className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 border-b border-r border-gp-telemetryBlue/45" />

                            <div className="relative z-10 space-y-3">
                              <h2 className="text-4xl font-semibold uppercase tracking-[0.14em] text-white">{session.name}</h2>
                              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-gp-textSoft">{session.groupName}</p>
                              <p className="text-base font-semibold uppercase tracking-[0.12em] text-cyan-200">{timeRange}</p>

                              <div className="h-px w-full bg-gradient-to-r from-gp-racingRed/70 via-gp-telemetryBlue/50 to-transparent" />

                              <div className="flex items-center justify-between gap-3">
                                <p className="text-xs uppercase tracking-[0.12em] text-gp-textSoft">
                                  Pilotos asignados: <span className="font-semibold text-white">{session.assignedPilots.length}</span>
                                </p>
                                <span
                                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                                    isCompleted
                                      ? 'border-gp-stateGreen/55 bg-gp-stateGreen/15 text-green-200'
                                      : 'border-gp-telemetryBlue/55 bg-gp-telemetryBlue/15 text-cyan-200'
                                  }`}
                                >
                                  <span className={`h-2 w-2 rounded-full ${isCompleted ? 'bg-gp-stateGreen' : 'bg-gp-telemetryBlue'}`} />
                                  {isCompleted ? 'Completed' : 'Pending'}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {selectedSession ? (
                      <article
                        className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl transition-opacity duration-300"
                        style={{ animation: 'fadeInPanel 240ms ease-out' }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">DETALLE DE SESIÓN</p>
                            <h2 className="mt-1 text-2xl font-semibold uppercase tracking-[0.14em] text-white">
                              {selectedSession.name} · {selectedSession.groupName}
                            </h2>
                            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-gp-textSoft">
                              {getQualySessionTimeRange(selectedSession.startTime, selectedSession.duration)} · {selectedSession.assignedPilots.length} pilotos
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 h-px w-full bg-gradient-to-r from-gp-racingRed/85 via-gp-telemetryBlue/55 to-transparent" />

                        {selectedSessionPilots.length === 0 ? (
                          <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-xs uppercase tracking-[0.14em] text-gp-textSoft">
                            No hay pilotos asignados a esta sesión
                          </div>
                        ) : (
                          <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                            <table className="w-full text-sm">
                              <thead className="bg-white/[0.03]">
                                <tr className="text-left text-[11px] uppercase tracking-[0.13em] text-gp-textSoft">
                                  <th className="px-4 py-3">Número piloto</th>
                                  <th className="px-4 py-3">Nombre</th>
                                  <th className="px-4 py-3">Nivel</th>
                                  <th className="px-4 py-3">Tiempo Qualy</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedSessionPilots.map(({ pilot, qualyTime }) => (
                                  <tr key={pilot.id} className="border-t border-white/10 bg-white/[0.01]">
                                    <td className="px-4 py-3 text-sm font-semibold text-cyan-200">#{String(pilot.numeroPiloto).padStart(2, '0')}</td>
                                    <td className="px-4 py-3 text-sm font-medium uppercase tracking-[0.08em] text-white">
                                      {pilot.nombre} {pilot.apellidos}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-gp-textSoft">{pilot.nivel}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-cyan-200">
                                      {typeof qualyTime === 'number' ? `${qualyTime.toFixed(3)} s` : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </article>
                    ) : null}
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeInPanel {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {isAssignOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsAssignOpen(false)}
            aria-label="Cerrar panel de asignación"
          />
          <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[rgba(10,15,22,0.94)] shadow-panel-deep">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-gp-textSoft">Asignación de pilotos</p>
                <h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.14em] text-white">
                  Configurar sesiones Qualy
                </h2>
                <p className="mt-2 text-sm text-gp-textSoft">
                  Elige el criterio de asignación o ajusta manualmente las sesiones.
                </p>
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
                  { key: 'levels', title: 'Por niveles', desc: 'Agrupa pilotos por nivel y balancea en sesiones.' },
                  { key: 'karts', title: 'Por karts', desc: 'Ordena por cilindrada y reparte entre sesiones.' },
                  { key: 'random', title: 'Random', desc: 'Distribuye pilotos aleatoriamente en cada sesión.' },
                  { key: 'manual', title: 'Manual', desc: 'Asignación directa por sesión, piloto a piloto.' }
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setAssignMode(option.key as 'levels' | 'karts' | 'random' | 'manual')}
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

              {assignMode === 'manual' && manualSession ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px,1fr]">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.13em] text-gp-textSoft">Sesiones</p>
                    <div className="space-y-2">
                      {qualySessions.map((session) => (
                        <button
                          key={session.id}
                          type="button"
                          onClick={() => setManualSessionId(session.id)}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                            manualSession.id === session.id
                              ? 'border-gp-racingRed/55 bg-gp-racingRed/15 text-red-200'
                              : 'border-white/10 text-gp-textSoft hover:border-gp-telemetryBlue/40 hover:text-cyan-200'
                          }`}
                        >
                          <span>{session.name}</span>
                          <span className="text-[10px]">{manualAssignments[session.id]?.length ?? session.assignedPilots.length} pilotos</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white">{manualSession.name}</p>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">
                          {manualAssignments[manualSession.id]?.length ?? manualSession.assignedPilots.length} pilotos asignados
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setManualAssignments((prev) => ({
                            ...prev,
                            [manualSession.id]: []
                          }))
                        }
                        className="rounded-lg border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gp-textSoft transition-colors hover:border-white/20 hover:text-white"
                      >
                        Limpiar sesión
                      </button>
                    </div>
                    <div className="max-h-[420px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-white/[0.02]">
                          <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">
                            <th className="px-4 py-3">Asignar</th>
                            <th className="px-4 py-3">Piloto</th>
                            <th className="px-4 py-3">Nivel</th>
                            <th className="px-4 py-3">Kart</th>
                            <th className="px-4 py-3">Sesión</th>
                          </tr>
                        </thead>
                        <tbody>
                          {eligiblePilots.map((pilot) => {
                            const assignedSession = manualPilotToSession.get(pilot.id);
                            const isAssignedHere = assignedSession === manualSession.name;

                            return (
                              <tr key={pilot.id} className="border-t border-white/10 bg-white/[0.01]">
                                <td className="px-4 py-2">
                                  <button
                                    type="button"
                                    onClick={() => handleManualToggle(pilot.id)}
                                    className={`h-6 w-6 rounded-md border text-xs font-semibold transition-colors ${
                                      isAssignedHere
                                        ? 'border-gp-telemetryBlue/60 bg-gp-telemetryBlue/20 text-cyan-200'
                                        : 'border-white/10 text-gp-textSoft hover:border-gp-telemetryBlue/40 hover:text-cyan-200'
                                    }`}
                                  >
                                    {isAssignedHere ? '✓' : '+'}
                                  </button>
                                </td>
                                <td className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white">
                                  #{String(pilot.numeroPiloto).padStart(2, '0')} · {pilot.nombre} {pilot.apellidos}
                                </td>
                                <td className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gp-textSoft">
                                  {pilot.nivel}
                                </td>
                                <td className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gp-textSoft">
                                  {pilot.kart}
                                </td>
                                <td className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gp-textSoft">
                                  {assignedSession ?? '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
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
                Aplicar asignación
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
