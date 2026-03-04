'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { usePilots } from '@/context/PilotsContext';
import { loadModuleState, saveModuleState } from '@/lib/eventStateClient';
import { useEventRuntimeConfig } from '@/lib/event-client';
import { normalizeSanctions, type SanctionEffectType, type SanctionPhaseType, type SanctionRecord } from '@/lib/sanctions';

export default function ResultsSanctionsPage() {
  const { activeEventId, isHydrated: activeEventHydrated } = useActiveEvent();
  const { pilots, isHydrated: pilotsHydrated } = usePilots();
  const runtimeConfig = useEventRuntimeConfig(activeEventId);

  const [sanctions, setSanctions] = useState<SanctionRecord[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const [pilotId, setPilotId] = useState('');
  const [sourceType, setSourceType] = useState<SanctionPhaseType>('qualy');
  const [sourceIndex, setSourceIndex] = useState('1');
  const [targetType, setTargetType] = useState<SanctionPhaseType>('race');
  const [targetIndex, setTargetIndex] = useState('1');
  const [effectType, setEffectType] = useState<SanctionEffectType>('drop_positions');
  const [effectValue, setEffectValue] = useState('1');
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');

  const raceCount = Math.max(1, runtimeConfig?.raceCount ?? 2);
  const qualyCount = Math.max(1, runtimeConfig?.qualyGroups ?? 1);

  useEffect(() => {
    if (!activeEventHydrated || !pilotsHydrated) {
      return;
    }

    setIsHydrated(false);

    void (async () => {
      try {
        const payload = await loadModuleState<unknown>(activeEventId, 'sanctions', []);
        setSanctions(normalizeSanctions(payload));
      } finally {
        setIsHydrated(true);
      }
    })();
  }, [activeEventHydrated, pilotsHydrated, activeEventId]);

  const sortedPilots = useMemo(
    () => [...pilots].sort((a, b) => a.numeroPiloto - b.numeroPiloto),
    [pilots]
  );

  const persist = async (next: SanctionRecord[]) => {
    setSanctions(next);
    await saveModuleState(activeEventId, 'sanctions', next);
  };

  const handleAddSanction = async () => {
    if (!pilotId) {
      setFeedback('Selecciona un piloto.');
      return;
    }

    if (!reason.trim()) {
      setFeedback('Añade un motivo de sanción.');
      return;
    }

    const parsedSource = Number(sourceIndex);
    const parsedTarget = Number(targetIndex);
    if (!Number.isFinite(parsedSource) || parsedSource <= 0 || !Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setFeedback('Fase origen/destino inválida.');
      return;
    }

    const numericEffectValue = Number(effectValue);

    const next: SanctionRecord = {
      id: crypto.randomUUID(),
      pilotId,
      sourcePhaseType: sourceType,
      sourceIndex: Math.floor(parsedSource),
      targetPhaseType: targetType,
      targetIndex: Math.floor(parsedTarget),
      effectType,
      effectValue:
        effectType === 'dsq' ? null : Number.isFinite(numericEffectValue) && numericEffectValue >= 0 ? numericEffectValue : 0,
      reason: reason.trim(),
      active: true,
      createdAt: new Date().toISOString()
    };

    const merged = normalizeSanctions([next, ...sanctions]);
    await persist(merged);
    setReason('');
    setFeedback('Sanción guardada.');
  };

  const toggleActive = async (id: string) => {
    const next = sanctions.map((item) => (item.id === id ? { ...item, active: !item.active } : item));
    await persist(next);
  };

  const removeSanction = async (id: string) => {
    const next = sanctions.filter((item) => item.id !== id);
    await persist(next);
  };

  const optionsByType = (type: SanctionPhaseType) => {
    const max = type === 'race' ? raceCount : qualyCount;
    return Array.from({ length: max }, (_, idx) => idx + 1);
  };

  return (
    <main className="min-h-screen bg-gp-bg text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar activeItem="results" />

        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(0,207,255,0.09),transparent_42%),radial-gradient(circle_at_85%_18%,rgba(225,6,0,0.08),transparent_40%),linear-gradient(to_bottom,#0A0F16,#0A0F16)]" />

          <div className="relative z-10">
            <Header title="RESULTS" subtitle="Panel de sanciones" />

            <section className="px-5 py-6 sm:px-6">
              <div className="mx-auto max-w-7xl space-y-5">
                <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">MODO 03</p>
                      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.14em] text-white">SANCIONES</h1>
                    </div>

                    <Link
                      href={`/admin/events/${activeEventId}/results`}
                      className="inline-flex items-center gap-2 rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition-colors duration-200 hover:bg-gp-telemetryBlue/20"
                    >
                      <span aria-hidden>←</span>
                      Volver a Results
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Select
                      label="Piloto"
                      value={pilotId}
                      onChange={setPilotId}
                      options={sortedPilots.map((pilot) => ({
                        value: pilot.id,
                        label: `#${String(pilot.numeroPiloto).padStart(2, '0')} ${pilot.nombre} ${pilot.apellidos}`
                      }))}
                    />

                    <Select
                      label="Fase origen"
                      value={sourceType}
                      onChange={(value) => {
                        const nextType = value === 'race' ? 'race' : 'qualy';
                        setSourceType(nextType);
                        setSourceIndex('1');
                      }}
                      options={[
                        { value: 'qualy', label: 'Qualy' },
                        { value: 'race', label: 'Carrera' }
                      ]}
                    />

                    <Select
                      label="Origen nº"
                      value={sourceIndex}
                      onChange={setSourceIndex}
                      options={optionsByType(sourceType).map((index) => ({ value: String(index), label: String(index) }))}
                    />

                    <Select
                      label="Afecta a"
                      value={targetType}
                      onChange={(value) => {
                        const nextType = value === 'race' ? 'race' : 'qualy';
                        setTargetType(nextType);
                        setTargetIndex('1');
                      }}
                      options={[
                        { value: 'qualy', label: 'Qualy' },
                        { value: 'race', label: 'Carrera' }
                      ]}
                    />

                    <Select
                      label="Destino nº"
                      value={targetIndex}
                      onChange={setTargetIndex}
                      options={optionsByType(targetType).map((index) => ({ value: String(index), label: String(index) }))}
                    />

                    <Select
                      label="Efecto"
                      value={effectType}
                      onChange={(value) => setEffectType(value as SanctionEffectType)}
                      options={[
                        { value: 'drop_positions', label: 'Bajar puestos' },
                        { value: 'add_time_seconds', label: 'Sumar tiempo (s)' },
                        { value: 'points_deduction', label: 'Quitar puntos' },
                        { value: 'dsq', label: 'Descalificación' }
                      ]}
                    />

                    <Field
                      label="Valor"
                      value={effectValue}
                      onChange={setEffectValue}
                      disabled={effectType === 'dsq'}
                      placeholder={effectType === 'add_time_seconds' ? 'segundos' : 'valor'}
                    />

                    <Field label="Motivo" value={reason} onChange={setReason} placeholder="Descripción breve" />
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleAddSanction()}
                    className="mt-4 rounded-lg border border-gp-racingRed/55 bg-gp-racingRed/[0.15] px-4 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-red-100 transition-all duration-200 hover:bg-gp-racingRed/[0.25] hover:text-white"
                  >
                    Añadir sanción
                  </button>

                  {feedback ? (
                    <div className="mt-3 rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-4 py-3 text-xs uppercase tracking-[0.13em] text-cyan-200">
                      {feedback}
                    </div>
                  ) : null}
                </article>

                <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                  <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">SANCIONES REGISTRADAS</p>

                  {!isHydrated || sanctions.length === 0 ? (
                    <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-xs uppercase tracking-[0.13em] text-gp-textSoft">
                      No hay sanciones registradas.
                    </div>
                  ) : (
                    <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
                      <table className="w-full text-sm">
                        <thead className="bg-white/[0.03]">
                          <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">
                            <th className="px-3 py-2.5">Piloto</th>
                            <th className="px-3 py-2.5">Origen</th>
                            <th className="px-3 py-2.5">Afecta</th>
                            <th className="px-3 py-2.5">Efecto</th>
                            <th className="px-3 py-2.5">Motivo</th>
                            <th className="px-3 py-2.5">Estado</th>
                            <th className="px-3 py-2.5">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sanctions.map((sanction) => {
                            const pilot = pilots.find((item) => item.id === sanction.pilotId);
                            return (
                              <tr key={sanction.id} className="border-t border-white/10 bg-white/[0.01]">
                                <td className="px-3 py-2.5 text-sm font-medium uppercase tracking-[0.08em] text-white">
                                  {pilot ? `#${String(pilot.numeroPiloto).padStart(2, '0')} ${pilot.nombre} ${pilot.apellidos}` : sanction.pilotId}
                                </td>
                                <td className="px-3 py-2.5 text-xs uppercase tracking-[0.12em] text-gp-textSoft">
                                  {sanction.sourcePhaseType === 'race' ? 'Carrera' : 'Qualy'} {sanction.sourceIndex}
                                </td>
                                <td className="px-3 py-2.5 text-xs uppercase tracking-[0.12em] text-cyan-200">
                                  {sanction.targetPhaseType === 'race' ? 'Carrera' : 'Qualy'} {sanction.targetIndex}
                                </td>
                                <td className="px-3 py-2.5 text-xs uppercase tracking-[0.12em] text-amber-200">
                                  {labelEffect(sanction)}
                                </td>
                                <td className="px-3 py-2.5 text-xs uppercase tracking-[0.1em] text-white/80">{sanction.reason}</td>
                                <td className="px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]">
                                  {sanction.active ? (
                                    <span className="text-green-300">Activa</span>
                                  ) : (
                                    <span className="text-red-300">Anulada</span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => void toggleActive(sanction.id)}
                                      className="rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-200"
                                    >
                                      {sanction.active ? 'Anular' : 'Activar'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void removeSanction(sanction.id)}
                                      className="rounded-lg border border-gp-racingRed/45 bg-gp-racingRed/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-200"
                                    >
                                      Borrar
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function Select({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">{label}</p>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full bg-transparent text-sm uppercase tracking-[0.08em] text-white outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#0E141F]">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">{label}</p>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="mt-2 w-full bg-transparent text-sm uppercase tracking-[0.08em] text-white outline-none disabled:cursor-not-allowed disabled:text-gp-textSoft"
      />
    </label>
  );
}

function labelEffect(sanction: SanctionRecord) {
  if (sanction.effectType === 'dsq') {
    return 'DSQ';
  }

  if (sanction.effectType === 'drop_positions') {
    return `-${Math.max(0, Math.floor(sanction.effectValue ?? 0))} puestos`;
  }

  if (sanction.effectType === 'points_deduction') {
    return `-${Math.max(0, Math.floor(sanction.effectValue ?? 0))} puntos`;
  }

  return `+${Math.max(0, sanction.effectValue ?? 0)} s`;
}
