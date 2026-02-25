'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { useClassification } from '@/context/ClassificationContext';
import { usePilots } from '@/context/PilotsContext';

export default function ClassificationTimesPage() {
  const { activeEventId } = useActiveEvent();
  const { pilots, isHydrated: pilotsHydrated } = usePilots();
  const { groups, qualyRecords, isHydrated: classificationHydrated, saveQualyTimes } = useClassification();

  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [draftTimes, setDraftTimes] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState('');

  const groupedPilots = useMemo(() => {
    const records = qualyRecords.filter((record) => record.group === selectedGroup);
    return records
      .map((record) => {
        const pilot = pilots.find((entry) => entry.id === record.pilotId);
        if (!pilot) {
          return null;
        }

        return {
          pilot,
          qualyTime: record.qualyTime
        };
      })
      .filter((item): item is { pilot: (typeof pilots)[number]; qualyTime: number | null } => Boolean(item))
      .sort((a, b) => a.pilot.numeroPiloto - b.pilot.numeroPiloto);
  }, [pilots, qualyRecords, selectedGroup]);

  useEffect(() => {
    if (groups.length === 0) {
      return;
    }

    if (!selectedGroup || !groups.includes(selectedGroup)) {
      setSelectedGroup(groups[0]);
    }
  }, [groups, selectedGroup]);

  useEffect(() => {
    const nextDraft: Record<string, string> = {};
    groupedPilots.forEach(({ pilot, qualyTime }) => {
      nextDraft[pilot.id] = typeof qualyTime === 'number' ? qualyTime.toFixed(3) : '';
    });

    setDraftTimes(nextDraft);
    setFeedback('');
  }, [groupedPilots]);

  const isHydrated = pilotsHydrated && classificationHydrated;

  const handleSave = () => {
    const payload = groupedPilots.map(({ pilot }) => {
      const parsed = Number(draftTimes[pilot.id]);
      return {
        pilotId: pilot.id,
        qualyTime: Number.isFinite(parsed) && parsed > 0 ? parsed : null
      };
    });

    saveQualyTimes(payload);
    setFeedback('Tiempos de Qualy guardados correctamente.');
  };

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
                      <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">SUBMÓDULO 02</p>
                      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.14em] text-white">TIEMPOS QUALY</h1>
                    </div>

                    <Link
                      href={`/admin/events/${activeEventId}/classification`}
                      className="inline-flex items-center gap-2 rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition-colors duration-200 hover:bg-gp-telemetryBlue/20"
                    >
                      <span aria-hidden>←</span>
                      Volver a Classification
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[220px_1fr] sm:items-end">
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.13em] text-gp-textSoft">Grupo</p>
                      <select
                        value={selectedGroup}
                        onChange={(event) => setSelectedGroup(event.target.value)}
                        className="h-11 w-full rounded-lg border border-white/15 bg-[#0E141F] px-3 text-sm text-white outline-none transition-all duration-200 focus:border-gp-racingRed/65 focus:shadow-input-red"
                      >
                        {groups.map((group) => (
                          <option key={group} value={group}>
                            {group}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm uppercase tracking-[0.12em] text-gp-textSoft">
                      Pilotos asignados: <span className="font-semibold text-white">{groupedPilots.length}</span>
                    </div>
                  </div>

                  <div className="mt-4 h-px w-full bg-gradient-to-r from-gp-racingRed/80 via-gp-telemetryBlue/55 to-transparent" />
                </article>

                {!isHydrated ? (
                  <div className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.7)] px-5 py-10 text-center text-sm uppercase tracking-[0.14em] text-gp-textSoft">
                    Cargando datos de Qualy...
                  </div>
                ) : (
                  <article className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] shadow-panel-deep backdrop-blur-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-sm">
                        <thead className="bg-white/[0.03]">
                          <tr className="text-left text-[11px] uppercase tracking-[0.13em] text-gp-textSoft">
                            <th className="px-4 py-3">Nº Piloto</th>
                            <th className="px-4 py-3">Nombre</th>
                            <th className="px-4 py-3">Tiempo Qualy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedPilots.map(({ pilot }) => (
                            <tr key={pilot.id} className="border-t border-white/10 bg-white/[0.01]">
                              <td className="px-4 py-3 text-sm font-semibold text-cyan-200">#{String(pilot.numeroPiloto).padStart(2, '0')}</td>
                              <td className="px-4 py-3 text-sm font-medium uppercase tracking-[0.08em] text-white">
                                {pilot.nombre} {pilot.apellidos}
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  value={draftTimes[pilot.id] ?? ''}
                                  onChange={(event) =>
                                    setDraftTimes((prev) => ({
                                      ...prev,
                                      [pilot.id]: event.target.value
                                    }))
                                  }
                                  placeholder="00.000"
                                  className="h-10 w-[180px] rounded-md border border-white/15 bg-[#0E141F] px-3 text-sm text-white outline-none transition-all duration-200 focus:border-gp-racingRed/65 focus:shadow-input-red"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-4">
                      {feedback ? (
                        <div className="rounded-lg border border-gp-stateGreen/45 bg-gp-stateGreen/10 px-3 py-2 text-xs uppercase tracking-[0.13em] text-green-200">
                          {feedback}
                        </div>
                      ) : (
                        <div className="text-xs uppercase tracking-[0.13em] text-gp-textSoft">
                          Formato en segundos (ejemplo: 51.230)
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleSave}
                        className="rounded-lg border border-gp-racingRed/55 bg-gp-racingRed/[0.15] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-red-100 transition-all duration-200 hover:bg-gp-racingRed/[0.25] hover:text-white"
                      >
                        Guardar tiempos Qualy
                      </button>
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
