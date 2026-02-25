'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { usePilots } from '@/context/PilotsContext';
import { useTimeAttackSessions } from '@/context/TimeAttackContext';

export default function TimeAttackTimesPage() {
  const { activeEventId } = useActiveEvent();
  const { pilots } = usePilots();
  const { sessions, isHydrated, saveSessionTimes } = useTimeAttackSessions();

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    [sessions]
  );

  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [draftRawTimes, setDraftRawTimes] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedSessionId && sortedSessions.length > 0) {
      setSelectedSessionId(sortedSessions[0].id);
    }
  }, [selectedSessionId, sortedSessions]);

  const selectedSession = sortedSessions.find((session) => session.id === selectedSessionId) ?? null;

  const assignedPilots = useMemo(() => {
    if (!selectedSession) {
      return [];
    }

    return selectedSession.assignedPilots
      .map((pilotId) => pilots.find((pilot) => pilot.id === pilotId))
      .filter((pilot): pilot is NonNullable<typeof pilot> => Boolean(pilot));
  }, [pilots, selectedSession]);

  useEffect(() => {
    if (!selectedSession) {
      setDraftRawTimes({});
      return;
    }

    const nextRawTimes: Record<string, string> = {};
    selectedSession.assignedPilots.forEach((pilotId) => {
      const found = selectedSession.times.find((time) => time.pilotId === pilotId);
      if (found) {
        nextRawTimes[pilotId] = found.rawTime.toFixed(3);
      }
    });

    setDraftRawTimes(nextRawTimes);
    setFeedback('');
    setError('');
  }, [selectedSession]);

  const isSessionCompleted = useMemo(() => {
    if (!selectedSession || selectedSession.assignedPilots.length === 0) {
      return false;
    }

    return selectedSession.assignedPilots.every((pilotId) =>
      selectedSession.times.some((time) => time.pilotId === pilotId && time.rawTime > 0)
    );
  }, [selectedSession]);

  const handleSave = () => {
    if (!selectedSession) {
      return;
    }

    if (selectedSession.status === 'closed') {
      setError('Sesión cerrada. No se permite registrar tiempos.');
      return;
    }

    const pilotRawTimes = selectedSession.assignedPilots
      .map((pilotId) => ({
        pilotId,
        rawTime: Number(draftRawTimes[pilotId])
      }))
      .filter((item) => Number.isFinite(item.rawTime) && item.rawTime > 0);

    const result = saveSessionTimes({
      sessionId: selectedSession.id,
      pilotRawTimes
    });

    if (!result.ok) {
      if (result.reason === 'closed') {
        setError('Sesión cerrada. No se permite registrar tiempos.');
      } else {
        setError('No se pudo guardar el cronometraje de la sesión.');
      }
      return;
    }

    setError('');
    setFeedback('Tiempos guardados correctamente.');
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
                      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.14em] text-white">TIEMPOS</h1>
                    </div>

                    <Link
                      href={`/admin/events/${activeEventId}/time-attack`}
                      className="inline-flex items-center gap-2 rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition-colors duration-200 hover:bg-gp-telemetryBlue/20"
                    >
                      <span aria-hidden>←</span>
                      Volver a Time Attack
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[220px_auto] lg:items-end">
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.13em] text-gp-textSoft">Sesión</p>
                      <select
                        value={selectedSessionId}
                        onChange={(event) => setSelectedSessionId(event.target.value)}
                        className="h-11 w-full rounded-lg border border-white/15 bg-[#0E141F] px-3 text-sm text-white outline-none transition-all duration-200 focus:border-gp-racingRed/65 focus:shadow-input-red"
                      >
                        {sortedSessions.map((session) => (
                          <option key={session.id} value={session.id}>
                            {session.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedSession ? (
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.13em] ${
                          isSessionCompleted
                            ? 'border-gp-stateGreen/45 bg-gp-stateGreen/10 text-green-300'
                            : 'border-white/20 bg-white/[0.04] text-gp-textSoft'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isSessionCompleted ? 'bg-gp-stateGreen shadow-[0_0_8px_rgba(0,255,133,0.7)]' : 'bg-gp-textSoft/50'
                          }`}
                        />
                        {isSessionCompleted ? 'Sesión completada' : 'Sesión en carga'}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 h-px w-full bg-gradient-to-r from-gp-racingRed/80 via-gp-telemetryBlue/55 to-transparent" />
                </article>

                {!isHydrated || !selectedSession ? (
                  <div className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.7)] px-5 py-10 text-center text-sm uppercase tracking-[0.14em] text-gp-textSoft">
                    Cargando cronometraje...
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4">
                      <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-4 shadow-panel-deep backdrop-blur-xl">
                        <p className="text-xs uppercase tracking-[0.14em] text-gp-textSoft">Pilotos asignados a {selectedSession.name}</p>

                        <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                          <table className="w-full text-sm">
                            <thead className="bg-white/[0.03]">
                              <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">
                                <th className="px-3 py-3">Piloto</th>
                                <th className="px-3 py-3">Tiempo</th>
                                <th className="px-3 py-3 text-right">Tiempo corregido</th>
                              </tr>
                            </thead>
                            <tbody>
                              {assignedPilots.map((pilot) => {
                                const timeData = selectedSession.times.find((time) => time.pilotId === pilot.id);
                                const corrected = timeData?.correctedTime;

                                return (
                                  <tr key={pilot.id} className="border-t border-white/10 bg-white/[0.01]">
                                    <td className="px-3 py-3">
                                      <p className="font-medium uppercase tracking-[0.08em] text-white">{pilot.nombre} {pilot.apellidos}</p>
                                      <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">#{String(pilot.numeroPiloto).padStart(2, '0')}</p>
                                    </td>
                                    <td className="px-3 py-3">
                                      <input
                                        type="number"
                                        step="0.001"
                                        min="0"
                                        value={draftRawTimes[pilot.id] ?? ''}
                                        onChange={(event) =>
                                          setDraftRawTimes((prev) => ({
                                            ...prev,
                                            [pilot.id]: event.target.value
                                          }))
                                        }
                                        disabled={selectedSession.status === 'closed'}
                                        placeholder="00.000"
                                        className="h-9 w-full rounded-md border border-white/15 bg-[#0E141F] px-2 text-sm text-white outline-none transition-all duration-200 focus:border-gp-racingRed/65 focus:shadow-input-red disabled:cursor-not-allowed disabled:opacity-45"
                                      />
                                    </td>
                                    <td className="px-3 py-3 text-right text-sm font-semibold text-cyan-200">
                                      {typeof corrected === 'number' ? `${corrected.toFixed(3)} s` : '--'}
                                    </td>
                                  </tr>
                                );
                              })}

                              {assignedPilots.length === 0 ? (
                                <tr>
                                  <td colSpan={3} className="px-3 py-8 text-center text-xs uppercase tracking-[0.14em] text-gp-textSoft">
                                    No hay pilotos asignados en esta sesión.
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </div>
                      </article>
                    </div>

                    {error ? (
                      <div className="rounded-lg border border-gp-racingRed/45 bg-gp-racingRed/10 px-4 py-3 text-xs uppercase tracking-[0.13em] text-red-200">
                        {error}
                      </div>
                    ) : null}

                    {feedback ? (
                      <div className="rounded-lg border border-gp-stateGreen/45 bg-gp-stateGreen/10 px-4 py-3 text-xs uppercase tracking-[0.13em] text-green-200">
                        {feedback}
                      </div>
                    ) : null}

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={selectedSession.status === 'closed'}
                        className="rounded-lg border border-gp-racingRed/55 bg-gp-racingRed/[0.15] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-red-100 transition-all duration-200 hover:bg-gp-racingRed/[0.25] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Guardar tiempos
                      </button>
                    </div>
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
