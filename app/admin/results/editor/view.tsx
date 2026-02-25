'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { loadModuleState, saveModuleState } from '@/lib/eventStateClient';
import {
  EMPTY_RACE_RESULT,
  computeRaceResults,
  isRaceGrid,
  normalizeRaceResult,
  type RaceComputedResult,
  type RaceGrid,
  type RaceKey,
  type StoredResults
} from '@/lib/resultsEngine';

type StoredRaces = {
  race1: RaceGrid | null;
  race2: RaceGrid | null;
};

type EditorRow = {
  group: 'group1' | 'group2';
  pilot: {
    pilotId: string;
    numeroPiloto: number;
    fullName: string;
    teamName: string;
    classificationPosition: number;
    category: '390cc' | '270cc';
  };
};

export default function ResultsEditorPage() {
  const { activeEventId, isHydrated: activeEventHydrated } = useActiveEvent();
  const [races, setRaces] = useState<StoredRaces>({ race1: null, race2: null });
  const [results, setResults] = useState<StoredResults>({ race1: EMPTY_RACE_RESULT, race2: EMPTY_RACE_RESULT });
  const [draftPositions, setDraftPositions] = useState<Record<RaceKey, Record<string, string>>>({ race1: {}, race2: {} });
  const [isHydrated, setIsHydrated] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeEventHydrated) {
      return;
    }

    setIsHydrated(false);

    void (async () => {
      try {
        const parsedRaces = await loadModuleState<StoredRaces>(activeEventId, 'races', { race1: null, race2: null });
        setRaces({
          race1: isRaceGrid(parsedRaces?.race1) ? parsedRaces.race1 : null,
          race2: isRaceGrid(parsedRaces?.race2) ? parsedRaces.race2 : null
        });

        const parsedResults = await loadModuleState<StoredResults>(activeEventId, 'results', {
          race1: EMPTY_RACE_RESULT,
          race2: EMPTY_RACE_RESULT
        });
        setResults({
          race1: normalizeRaceResult(parsedResults?.race1),
          race2: normalizeRaceResult(parsedResults?.race2)
        });
      } finally {
        setIsHydrated(true);
      }
    })();
  }, [activeEventHydrated, activeEventId]);

  useEffect(() => {
    if (!isHydrated || !activeEventHydrated) {
      return;
    }

    void saveModuleState(activeEventId, 'results', results);
  }, [isHydrated, results, activeEventHydrated, activeEventId]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const nextDraft: Record<RaceKey, Record<string, string>> = { race1: {}, race2: {} };

    (['race1', 'race2'] as const).forEach((raceKey) => {
      const grid = races[raceKey];
      if (!grid) {
        return;
      }

      const existingByPilot = new Map(results[raceKey].entries.map((entry) => [entry.pilotId, entry.finalPosition]));
      buildEditorRows(grid).forEach(({ pilot }) => {
        const found = existingByPilot.get(pilot.pilotId);
        nextDraft[raceKey][pilot.pilotId] = typeof found === 'number' ? String(found) : '';
      });
    });

    setDraftPositions(nextDraft);
  }, [isHydrated, races, results]);

  const hasRaceGrids = Boolean(races.race1 && races.race2);

  const handlePositionChange = (race: RaceKey, pilotId: string, value: string) => {
    setDraftPositions((prev) => ({
      ...prev,
      [race]: {
        ...prev[race],
        [pilotId]: value
      }
    }));
  };

  const handleCalculateRace = (race: RaceKey) => {
    const grid = races[race];
    if (!grid) {
      setError('No existen parrillas generadas para esta carrera.');
      return;
    }

    const parsed = buildEditorRows(grid).map(({ pilot, group }) => ({
      group,
      pilot,
      finalPosition: Number(draftPositions[race][pilot.pilotId])
    }));

    const allFilled = parsed.every((item) => Number.isFinite(item.finalPosition) && item.finalPosition > 0);
    if (!allFilled) {
      setError('Debes introducir todas las posiciones finales antes de guardar.');
      return;
    }

    const duplicatedInsideGroup = (['group1', 'group2'] as const).some((group) => {
      const positions = parsed.filter((item) => item.group === group).map((item) => item.finalPosition);
      return new Set(positions).size !== positions.length;
    });

    if (duplicatedInsideGroup) {
      setError('Las posiciones finales no pueden repetirse dentro del mismo grupo.');
      return;
    }

    const computed = computeRaceResults(
      race,
      parsed.map(({ pilot, finalPosition }) => ({ pilot, finalPosition }))
    );
    setResults((prev) => ({ ...prev, [race]: computed }));
    setError('');
    setFeedback(`Datos guardados y puntos calculados para ${race === 'race1' ? 'Carrera 1' : 'Carrera 2'}.`);
  };

  return (
    <main className="min-h-screen bg-gp-bg text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar activeItem="results" />

        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(0,207,255,0.09),transparent_42%),radial-gradient(circle_at_85%_18%,rgba(225,6,0,0.08),transparent_40%),linear-gradient(to_bottom,#0A0F16,#0A0F16)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-size:11px_11px] [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />

          <div className="relative z-10">
            <Header title="RESULTS" subtitle="Introducción de resultados de carrera" />

            <section className="px-5 py-6 sm:px-6">
              <div className="mx-auto max-w-7xl space-y-5">
                <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">MODO 01</p>
                      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.14em] text-white">INTRODUCIR RESULTADOS</h1>
                    </div>

                    <Link
                      href={`/admin/events/${activeEventId}/results`}
                      className="inline-flex items-center gap-2 rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition-colors duration-200 hover:bg-gp-telemetryBlue/20"
                    >
                      <span aria-hidden>←</span>
                      Volver a Results
                    </Link>
                  </div>

                  {!hasRaceGrids ? (
                    <div className="mt-4 rounded-lg border border-gp-racingRed/45 bg-gp-racingRed/10 px-4 py-3 text-xs uppercase tracking-[0.13em] text-red-200">
                      Aviso técnico: no se puede introducir resultados sin parrillas generadas.
                    </div>
                  ) : null}

                  {error ? (
                    <div className="mt-4 rounded-lg border border-gp-racingRed/45 bg-gp-racingRed/10 px-4 py-3 text-xs uppercase tracking-[0.13em] text-red-200">
                      {error}
                    </div>
                  ) : null}

                  {feedback ? (
                    <div className="mt-4 rounded-lg border border-gp-stateGreen/45 bg-gp-stateGreen/10 px-4 py-3 text-xs uppercase tracking-[0.13em] text-green-200">
                      {feedback}
                    </div>
                  ) : null}

                  <div className="mt-4 h-px w-full bg-gradient-to-r from-gp-racingRed/80 via-gp-telemetryBlue/55 to-transparent" />
                </article>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <RaceEditorCard
                    title="Carrera 1"
                    race="race1"
                    grid={races.race1}
                    draftPositions={draftPositions.race1}
                    onPositionChange={handlePositionChange}
                    onCalculate={handleCalculateRace}
                    computed={results.race1}
                    disabled={!isHydrated || !hasRaceGrids}
                  />
                  <RaceEditorCard
                    title="Carrera 2"
                    race="race2"
                    grid={races.race2}
                    draftPositions={draftPositions.race2}
                    onPositionChange={handlePositionChange}
                    onCalculate={handleCalculateRace}
                    computed={results.race2}
                    disabled={!isHydrated || !hasRaceGrids}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function RaceEditorCard({
  title,
  race,
  grid,
  draftPositions,
  onPositionChange,
  onCalculate,
  computed,
  disabled
}: {
  title: string;
  race: RaceKey;
  grid: RaceGrid | null;
  draftPositions: Record<string, string>;
  onPositionChange: (race: RaceKey, pilotId: string, value: string) => void;
  onCalculate: (race: RaceKey) => void;
  computed: RaceComputedResult;
  disabled: boolean;
}) {
  const rowsByGroup = useMemo(() => {
    if (!grid) {
      return { group1: [] as EditorRow[], group2: [] as EditorRow[] };
    }

    const rows = buildEditorRows(grid);
    return {
      group1: rows.filter((row) => row.group === 'group1'),
      group2: rows.filter((row) => row.group === 'group2')
    };
  }, [grid]);

  return (
    <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-4 shadow-panel-deep backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.14em] text-gp-textSoft">EDITOR</p>
      <h2 className="mt-1 text-2xl font-semibold uppercase tracking-[0.13em] text-white">{title}</h2>
      <div className="mt-3 h-px w-full bg-gradient-to-r from-gp-racingRed/70 via-gp-telemetryBlue/50 to-transparent" />

      {!grid ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-xs uppercase tracking-[0.14em] text-gp-textSoft">
          Parrilla no disponible para esta carrera.
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-4">
            <GroupEditorTable
              title="Grupo 1"
              race={race}
              rows={rowsByGroup.group1}
              draftPositions={draftPositions}
              onPositionChange={onPositionChange}
            />
            <GroupEditorTable
              title="Grupo 2"
              race={race}
              rows={rowsByGroup.group2}
              draftPositions={draftPositions}
              onPositionChange={onPositionChange}
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onCalculate(race)}
              disabled={disabled}
              className="rounded-lg border border-gp-racingRed/55 bg-gp-racingRed/[0.15] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.13em] text-red-100 transition-all duration-200 hover:bg-gp-racingRed/[0.25] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              Guardar y Calcular
            </button>

            <span className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">
              {computed.calculatedAt ? `Calculado: ${new Date(computed.calculatedAt).toLocaleTimeString('es-ES')}` : 'Sin cálculo'}
            </span>
          </div>
        </>
      )}
    </article>
  );
}

function GroupEditorTable({
  title,
  race,
  rows,
  draftPositions,
  onPositionChange
}: {
  title: string;
  race: RaceKey;
  rows: EditorRow[];
  draftPositions: Record<string, string>;
  onPositionChange: (race: RaceKey, pilotId: string, value: string) => void;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white">{title}</p>
        <span className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">{rows.length} pilotos</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03]">
            <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">
              <th className="px-3 py-2.5">Posición final</th>
              <th className="px-3 py-2.5">Número piloto</th>
              <th className="px-3 py-2.5">Nombre</th>
              <th className="px-3 py-2.5">Categoría</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ pilot }) => (
              <tr key={`${race}-${title}-${pilot.pilotId}`} className="border-t border-white/10 bg-white/[0.01]">
                <td className="px-3 py-2.5">
                  <input
                    type="number"
                    min="1"
                    value={draftPositions[pilot.pilotId] ?? ''}
                    onChange={(event) => onPositionChange(race, pilot.pilotId, event.target.value)}
                    className="h-9 w-24 rounded-md border border-white/15 bg-[#0E141F] px-2 text-sm text-white outline-none transition-all duration-200 focus:border-gp-racingRed/65 focus:shadow-input-red"
                  />
                </td>
                <td className="px-3 py-2.5 text-sm font-semibold text-cyan-200">#{String(pilot.numeroPiloto).padStart(2, '0')}</td>
                <td className="px-3 py-2.5 text-sm font-medium uppercase tracking-[0.08em] text-white">{pilot.fullName}</td>
                <td className="px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-gp-textSoft">{pilot.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function buildEditorRows(grid: RaceGrid): EditorRow[] {
  const group1Rows: EditorRow[] = [
    ...grid.group1.category390.map((pilot) => ({ group: 'group1' as const, pilot: { ...pilot, category: '390cc' as const } })),
    ...grid.group1.category270.map((pilot) => ({ group: 'group1' as const, pilot: { ...pilot, category: '270cc' as const } }))
  ];

  const group2Rows: EditorRow[] = [
    ...grid.group2.category390.map((pilot) => ({ group: 'group2' as const, pilot: { ...pilot, category: '390cc' as const } })),
    ...grid.group2.category270.map((pilot) => ({ group: 'group2' as const, pilot: { ...pilot, category: '270cc' as const } }))
  ];

  return [...group1Rows, ...group2Rows];
}
