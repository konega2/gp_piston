'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { useClassification } from '@/context/ClassificationContext';
import { usePilots } from '@/context/PilotsContext';
import { useTimeAttackSessions } from '@/context/TimeAttackContext';
import { buildCombinedStandings } from '@/lib/combinedStandings';

export default function ClassificationStandingsPage() {
  const { activeEventId } = useActiveEvent();
  const { pilots, isHydrated: pilotsHydrated } = usePilots();
  const { sessions, isHydrated: sessionsHydrated } = useTimeAttackSessions();
  const { qualyRecords, isHydrated: classificationHydrated } = useClassification();

  const standings = useMemo(
    () => buildCombinedStandings({ pilots, sessions, qualyRecords }),
    [pilots, qualyRecords, sessions]
  );

  const isHydrated = pilotsHydrated && sessionsHydrated && classificationHydrated;

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
                      <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">SUBMÓDULO 03</p>
                      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.14em] text-white">CLASIFICACIÓN CONJUNTA</h1>
                    </div>

                    <Link
                      href={`/admin/events/${activeEventId}/classification`}
                      className="inline-flex items-center gap-2 rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition-colors duration-200 hover:bg-gp-telemetryBlue/20"
                    >
                      <span aria-hidden>←</span>
                      Volver a Classification
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">Pilotos clasificados</p>
                      <p className="mt-1 text-lg font-semibold text-white">{standings.length}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">Mejor tiempo final</p>
                      <p className="mt-1 text-lg font-semibold text-cyan-200">
                        {standings.length > 0 ? `${formatTime(standings[0].finalTime)} s` : '--'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 h-px w-full bg-gradient-to-r from-gp-racingRed/80 via-gp-telemetryBlue/55 to-transparent" />
                </article>

                {!isHydrated ? (
                  <div className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.7)] px-5 py-10 text-center text-sm uppercase tracking-[0.14em] text-gp-textSoft">
                    Cargando clasificación conjunta...
                  </div>
                ) : standings.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.7)] px-5 py-10 text-center text-sm uppercase tracking-[0.14em] text-gp-textSoft">
                    No hay tiempos válidos de TA o Qualy para mostrar clasificación.
                  </div>
                ) : (
                  <article className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] shadow-panel-deep backdrop-blur-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px] text-sm">
                        <thead className="bg-white/[0.03]">
                          <tr className="text-left text-[11px] uppercase tracking-[0.13em] text-gp-textSoft">
                            <th className="px-4 py-3">Posición</th>
                            <th className="px-4 py-3">Nº Piloto</th>
                            <th className="px-4 py-3">Nombre</th>
                            <th className="px-4 py-3">Tiempo Final</th>
                            <th className="px-4 py-3">Fuente del tiempo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {standings.map((row, index) => (
                            <tr
                              key={row.pilotId}
                              className={`border-t border-white/10 ${row.fromTimeAttack ? 'bg-gp-telemetryBlue/[0.07]' : 'bg-white/[0.01]'}`}
                            >
                              <td className="px-4 py-3 text-sm font-semibold text-white">P{index + 1}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-cyan-200">#{String(row.numeroPiloto).padStart(2, '0')}</td>
                              <td className="px-4 py-3 text-sm font-medium uppercase tracking-[0.08em] text-white">{row.fullName}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-cyan-200">{formatTime(row.finalTime)} s</td>
                              <td className="px-4 py-3">
                                <div className="inline-flex items-center gap-2">
                                  <span
                                    className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                                      row.source === 'TA'
                                        ? 'border-gp-telemetryBlue/55 bg-gp-telemetryBlue/15 text-cyan-200'
                                        : row.source === 'QUALY'
                                          ? 'border-white/20 bg-white/[0.04] text-gp-textSoft'
                                          : 'border-gp-racingRed/45 bg-gp-racingRed/12 text-red-200'
                                    }`}
                                  >
                                    {row.source}
                                  </span>

                                  {row.fromTimeAttack ? (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-200">
                                      <span className="h-2 w-2 rounded-full bg-gp-telemetryBlue" />
                                      TA
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ))}
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
