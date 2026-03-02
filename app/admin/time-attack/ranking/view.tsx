'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { usePilots } from '@/context/PilotsContext';
import { useTimeAttackSessions } from '@/context/TimeAttackContext';

type RankingRow = {
  pilotId: string;
  numeroPiloto: number;
  fullName: string;
  bestCorrectedTime: number;
  sessionsDisputed: number;
};

export default function TimeAttackRankingPage() {
  const { activeEventId } = useActiveEvent();
  const { pilots, isHydrated: pilotsHydrated } = usePilots();
  const { sessions, isHydrated: sessionsHydrated } = useTimeAttackSessions();

  const ranking = useMemo<RankingRow[]>(() => {
    const eligiblePilots = pilots.filter((pilot) => pilot.hasTimeAttack);

    return eligiblePilots
      .map((pilot) => {
        const validTimesBySession = sessions
          .map((session) => {
            const pilotTime = session.times.find((time) => time.pilotId === pilot.id);
            if (!pilotTime || !Number.isFinite(pilotTime.correctedTime) || pilotTime.correctedTime <= 0) {
              return null;
            }

            return {
              sessionId: session.id,
              correctedTime: pilotTime.correctedTime
            };
          })
          .filter((value): value is { sessionId: string; correctedTime: number } => Boolean(value));

        if (validTimesBySession.length === 0) {
          return null;
        }

        const bestCorrectedTime = Math.min(...validTimesBySession.map((item) => item.correctedTime));
        const sessionsDisputed = new Set(validTimesBySession.map((item) => item.sessionId)).size;

        return {
          pilotId: pilot.id,
          numeroPiloto: pilot.numeroPiloto,
          fullName: `${pilot.nombre} ${pilot.apellidos}`,
          bestCorrectedTime,
          sessionsDisputed
        };
      })
      .filter((row): row is RankingRow => Boolean(row))
      .sort((a, b) => {
        const timeDelta = a.bestCorrectedTime - b.bestCorrectedTime;
        if (timeDelta !== 0) {
          return timeDelta;
        }

        const sessionsDelta = b.sessionsDisputed - a.sessionsDisputed;
        if (sessionsDelta !== 0) {
          return sessionsDelta;
        }

        return a.numeroPiloto - b.numeroPiloto;
      });
  }, [pilots, sessions]);

  const fastestTime = ranking[0]?.bestCorrectedTime ?? null;
  const isHydrated = pilotsHydrated && sessionsHydrated;

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
                      <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">CLASIFICACIÓN OFICIAL</p>
                      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.14em] text-white">Ranking General Time Attack</h1>
                    </div>

                    <Link
                      href={`/admin/events/${activeEventId}/time-attack`}
                      className="inline-flex items-center gap-2 rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition-colors duration-200 hover:bg-gp-telemetryBlue/20"
                    >
                      <span aria-hidden>←</span>
                      Volver a Time Attack
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">Pilotos clasificados</p>
                      <p className="mt-1 text-lg font-semibold text-white">{ranking.length}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">Mejor tiempo global</p>
                      <p className="mt-1 text-lg font-semibold text-cyan-200">{fastestTime ? `${formatTime(fastestTime)} s` : '--'}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">Actualización</p>
                      <p className="mt-1 text-lg font-semibold text-white">Tiempo real</p>
                    </div>
                  </div>

                  <div className="mt-4 h-px w-full bg-gradient-to-r from-gp-racingRed/80 via-gp-telemetryBlue/55 to-transparent" />
                </article>

                {!isHydrated ? (
                  <div className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.7)] px-5 py-10 text-center text-sm uppercase tracking-[0.14em] text-gp-textSoft">
                    Cargando clasificación oficial...
                  </div>
                ) : ranking.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.7)] px-5 py-10 text-center text-sm uppercase tracking-[0.14em] text-gp-textSoft">
                    Sin tiempos válidos para generar ranking.
                  </div>
                ) : (
                  <article className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] shadow-panel-deep backdrop-blur-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[860px] text-sm">
                        <thead className="bg-white/[0.03]">
                          <tr className="text-left text-[11px] uppercase tracking-[0.13em] text-gp-textSoft">
                            <th className="px-4 py-3">Posición</th>
                            <th className="px-4 py-3">Nº Piloto</th>
                            <th className="px-4 py-3">Nombre</th>
                            <th className="px-4 py-3">Mejor tiempo corregido</th>
                            <th className="px-4 py-3">Sesiones disputadas</th>
                            <th className="px-4 py-3">Conserva tiempo para Clasificación</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ranking.map((row, index) => {
                            const position = index + 1;
                            const isTopFive = position <= 5;

                            return (
                              <tr
                                key={row.pilotId}
                                className={`border-t border-white/10 ${
                                  isTopFive ? 'bg-gradient-to-r from-gp-racingRed/[0.10] via-white/[0.02] to-gp-telemetryBlue/[0.10]' : 'bg-white/[0.01]'
                                }`}
                              >
                                <td className="px-4 py-3">
                                  <div className="inline-flex items-center gap-2">
                                    <span className="text-base font-semibold text-white">#{position}</span>
                                    {isTopFive ? (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/45 bg-amber-300/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">
                                        <span aria-hidden>🏆</span>
                                        TOP 5
                                      </span>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-cyan-200">#{String(row.numeroPiloto).padStart(2, '0')}</td>
                                <td className="px-4 py-3 text-sm font-medium uppercase tracking-[0.08em] text-white">{row.fullName}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-cyan-200">{formatTime(row.bestCorrectedTime)} s</td>
                                <td className="px-4 py-3 text-sm font-semibold text-white">{row.sessionsDisputed}</td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center gap-2 rounded-full border border-gp-stateGreen/45 bg-gp-stateGreen/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-green-300">
                                    <span className="h-2 w-2 rounded-full bg-gp-stateGreen shadow-[0_0_8px_rgba(0,255,133,0.7)]" />
                                    ✔ Conserva
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </article>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function formatTime(value: number) {
  return (Math.round(value * 1000) / 1000).toFixed(3);
}
