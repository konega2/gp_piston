'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { useClassification } from '@/context/ClassificationContext';
import { usePilots } from '@/context/PilotsContext';
import { useTimeAttackSessions } from '@/context/TimeAttackContext';
import { loadEventStorageItem, saveEventStorageItem } from '@/lib/eventStorage';
import { buildCombinedStandings } from '@/lib/combinedStandings';

type RacePilot = {
  pilotId: string;
  numeroPiloto: number;
  fullName: string;
  teamName: string;
  classificationPosition: number;
};

type RaceGroupGrid = {
  category390: RacePilot[];
  category270: RacePilot[];
};

type RaceGrid = {
  group1: RaceGroupGrid;
  group2: RaceGroupGrid;
};

type StoredRaces = {
  race1: RaceGrid | null;
  race2: RaceGrid | null;
};

type TeamRecord = {
  id: string;
  name: string;
  members: string[];
};

const RACES_STORAGE_KEY = 'races';
const TEAMS_STORAGE_KEY = 'teams';

export default function RacesPage() {
  const { activeEventId, isHydrated: activeEventHydrated } = useActiveEvent();
  const { pilots, isHydrated: pilotsHydrated } = usePilots();
  const { sessions, isHydrated: sessionsHydrated } = useTimeAttackSessions();
  const { qualyRecords, isHydrated: qualyHydrated } = useClassification();

  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [storedRaces, setStoredRaces] = useState<StoredRaces>({ race1: null, race2: null });
  const [isHydrated, setIsHydrated] = useState(false);
  const [feedback, setFeedback] = useState('');

  const combinedStandings = useMemo(
    () => buildCombinedStandings({ pilots, sessions, qualyRecords }),
    [pilots, sessions, qualyRecords]
  );

  const pilotsById = useMemo(() => new Map(pilots.map((pilot) => [pilot.id, pilot])), [pilots]);

  const standingsWithPosition = useMemo(
    () => combinedStandings.map((item, index) => ({ ...item, position: index + 1 })),
    [combinedStandings]
  );

  const hasClassification = standingsWithPosition.length > 0;

  const teamByPilotId = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach((team) => {
      team.members.forEach((pilotId) => {
        if (!map.has(pilotId)) {
          map.set(pilotId, team.name);
        }
      });
    });
    return map;
  }, [teams]);

  useEffect(() => {
    if (!(pilotsHydrated && sessionsHydrated && qualyHydrated && activeEventHydrated)) {
      return;
    }

    setIsHydrated(false);

    try {
      const rawTeams = loadEventStorageItem(TEAMS_STORAGE_KEY, activeEventId);
      if (rawTeams) {
        const parsedTeams = JSON.parse(rawTeams) as TeamRecord[];
        if (Array.isArray(parsedTeams)) {
          setTeams(
            parsedTeams
              .filter(
                (team): team is TeamRecord =>
                  Boolean(team) && typeof team.id === 'string' && typeof team.name === 'string' && Array.isArray(team.members)
              )
              .map((team) => ({
                id: team.id,
                name: team.name,
                members: Array.from(new Set(team.members.filter((pilotId): pilotId is string => typeof pilotId === 'string')))
              }))
          );
        }
      } else {
        setTeams([]);
      }

      const rawRaces = loadEventStorageItem(RACES_STORAGE_KEY, activeEventId);
      if (rawRaces) {
        const parsedRaces = JSON.parse(rawRaces) as StoredRaces;
        setStoredRaces({
          race1: isRaceGrid(parsedRaces?.race1) ? parsedRaces.race1 : null,
          race2: isRaceGrid(parsedRaces?.race2) ? parsedRaces.race2 : null
        });
      } else {
        setStoredRaces({ race1: null, race2: null });
      }
    } finally {
      setIsHydrated(true);
    }
  }, [pilotsHydrated, sessionsHydrated, qualyHydrated, activeEventHydrated, activeEventId]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveEventStorageItem(RACES_STORAGE_KEY, activeEventId, JSON.stringify(storedRaces));
  }, [isHydrated, storedRaces, activeEventId]);

  const qualyTimeByPilot = useMemo(() => {
    const map = new Map<string, number>();
    qualyRecords.forEach((record) => {
      if (!Number.isFinite(record.qualyTime) || (record.qualyTime ?? 0) <= 0) {
        return;
      }

      const current = map.get(record.pilotId);
      if (typeof current !== 'number' || (record.qualyTime as number) < current) {
        map.set(record.pilotId, record.qualyTime as number);
      }
    });

    return map;
  }, [qualyRecords]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    setStoredRaces((prev) => syncStoredRacesWithTeams(prev, teamByPilotId));
  }, [isHydrated, teamByPilotId]);

  const handleGenerateRace1 = () => {
    if (!hasClassification) {
      setFeedback('No hay clasificación conjunta disponible para generar parrilla.');
      return;
    }

    const race1 = buildRaceGrid(standingsWithPosition, teamByPilotId, pilotsById, qualyTimeByPilot);
    setStoredRaces((prev) => ({ ...prev, race1 }));
    setFeedback('Parrilla Carrera 1 generada correctamente.');
  };

  const handleGenerateRace2 = () => {
    if (!hasClassification) {
      setFeedback('No hay clasificación conjunta disponible para generar parrilla.');
      return;
    }

    const race2 = buildRaceGrid(standingsWithPosition, teamByPilotId, pilotsById, qualyTimeByPilot);
    setStoredRaces((prev) => ({ ...prev, race2 }));
    setFeedback('Parrilla Carrera 2 generada correctamente.');
  };

  const handleUndoRaces = () => {
    setStoredRaces({ race1: null, race2: null });
    setFeedback('Parrillas eliminadas. Estado reseteado.');
  };

  return (
    <main className="min-h-screen bg-gp-bg text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar activeItem="races" />

        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(0,207,255,0.09),transparent_42%),radial-gradient(circle_at_85%_18%,rgba(225,6,0,0.08),transparent_40%),linear-gradient(to_bottom,#0A0F16,#0A0F16)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-size:11px_11px] [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />

          <div className="relative z-10">
            <Header title="RACES" subtitle="Generador oficial de parrillas GP Pistón Valencia" />

            <section className="px-5 py-6 sm:px-6">
              <div className="mx-auto max-w-7xl space-y-5">
                <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">MÓDULO OPERATIVO</p>
                      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.14em] text-white">PARRILLAS DE CARRERA</h1>
                    </div>

                    <Link
                      href={`/admin/events/${activeEventId}/classification/standings`}
                      className="inline-flex items-center gap-2 rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition-colors duration-200 hover:bg-gp-telemetryBlue/20"
                    >
                      <span aria-hidden>←</span>
                      Ver clasificación conjunta
                    </Link>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateRace1}
                      disabled={!isHydrated || !hasClassification}
                      className="rounded-xl border border-gp-racingRed/55 bg-gp-racingRed/[0.18] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-red-100 transition-all duration-200 hover:bg-gp-racingRed/[0.28] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Generar Parrilla Carrera 1
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateRace2}
                      disabled={!isHydrated || !hasClassification}
                      className="rounded-xl border border-gp-telemetryBlue/55 bg-gp-telemetryBlue/[0.18] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-cyan-100 transition-all duration-200 hover:bg-gp-telemetryBlue/[0.3] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Generar Parrilla Carrera 2
                    </button>

                    <button
                      type="button"
                      onClick={handleUndoRaces}
                      disabled={!isHydrated || (!storedRaces.race1 && !storedRaces.race2)}
                      className="rounded-xl border border-white/20 bg-white/[0.06] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-gp-textSoft transition-all duration-200 hover:border-gp-telemetryBlue/45 hover:bg-gp-telemetryBlue/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Deshacer Parrillas
                    </button>
                  </div>

                  {!hasClassification ? (
                    <div className="mt-4 rounded-lg border border-gp-racingRed/45 bg-gp-racingRed/10 px-4 py-3 text-xs uppercase tracking-[0.13em] text-red-200">
                      Aviso técnico: no se puede generar parrilla sin clasificación conjunta.
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
                  <RaceGridPanel title="Carrera 1" raceKey="race1" grid={storedRaces.race1} advantageCategory="270cc" />
                  <RaceGridPanel title="Carrera 2" raceKey="race2" grid={storedRaces.race2} advantageCategory="390cc" />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function RaceGridPanel({
  title,
  raceKey,
  grid,
  advantageCategory
}: {
  title: string;
  raceKey: 'race1' | 'race2';
  grid: RaceGrid | null;
  advantageCategory: '390cc' | '270cc';
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-4 shadow-panel-deep backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.14em] text-gp-textSoft">{raceKey.toUpperCase()}</p>
      <h2 className="mt-1 text-2xl font-semibold uppercase tracking-[0.13em] text-white">{title}</h2>
      <div className="mt-3 h-px w-full bg-gradient-to-r from-gp-racingRed/70 via-gp-telemetryBlue/50 to-transparent" />

      {!grid ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-xs uppercase tracking-[0.14em] text-gp-textSoft">
          Parrilla no generada.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <GroupSection title="Grupo 1" grid={grid.group1} advantageCategory={advantageCategory} />
          <GroupSection title="Grupo 2" grid={grid.group2} advantageCategory={advantageCategory} />
        </div>
      )}
    </article>
  );
}

function GroupSection({
  title,
  grid,
  advantageCategory
}: {
  title: string;
  grid: RaceGroupGrid;
  advantageCategory: '390cc' | '270cc';
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white">{title}</p>
        <span className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">
          {grid.category390.length + grid.category270.length} pilotos
        </span>
      </div>

      <div className="space-y-3">
        <CategorySection
          title="390cc"
          pilots={grid.category390}
          showAdvantage={advantageCategory === '390cc'}
          startPosition={1}
          step={2}
        />
        <CategorySection
          title="270cc"
          pilots={grid.category270}
          showAdvantage={advantageCategory === '270cc'}
          startPosition={2}
          step={2}
        />
      </div>
    </section>
  );
}

function CategorySection({
  title,
  pilots,
  showAdvantage,
  startPosition,
  step
}: {
  title: '390cc' | '270cc';
  pilots: RacePilot[];
  showAdvantage: boolean;
  startPosition: number;
  step: number;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white">Sección {title}</p>
        <div className="flex items-center gap-2">
          {showAdvantage ? (
            <span className="inline-flex items-center rounded-full border border-gp-stateGreen/45 bg-gp-stateGreen/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-green-200">
              +35s ventaja
            </span>
          ) : null}
          <span className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">{pilots.length} pilotos</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03]">
            <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">
              <th className="px-3 py-2.5">Posición salida</th>
              <th className="px-3 py-2.5">Nº piloto</th>
              <th className="px-3 py-2.5">Nombre</th>
              <th className="px-3 py-2.5">Equipo</th>
            </tr>
          </thead>
          <tbody>
            {pilots.map((pilot, index) => (
              <tr key={`${title}-${pilot.pilotId}`} className="border-t border-white/10 bg-white/[0.01]">
                <td className="px-3 py-2.5 text-sm font-semibold text-white">P{startPosition + index * step}</td>
                <td className="px-3 py-2.5 text-sm font-semibold text-cyan-200">#{String(pilot.numeroPiloto).padStart(2, '0')}</td>
                <td className="px-3 py-2.5 text-sm font-medium uppercase tracking-[0.08em] text-white">
                  {pilot.fullName}
                  <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gp-textSoft">(Clasif. P{pilot.classificationPosition})</span>
                </td>
                <td className="px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-gp-textSoft">{pilot.teamName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function buildRaceGrid(
  standings: Array<{
    pilotId: string;
    numeroPiloto: number;
    fullName: string;
    position: number;
  }>,
  teamByPilotId: Map<string, string>,
  pilotsById: Map<string, { kart: '390cc' | '270cc' }>,
  qualyTimeByPilot: Map<string, number>
): RaceGrid {
  const total = standings.length;
  const groupSize = Math.ceil(total / 2);
  const group1 = standings.slice(0, groupSize);
  const group2 = standings.slice(groupSize);

  const mapPilot = (pilot: (typeof standings)[number]): RacePilot => ({
    pilotId: pilot.pilotId,
    numeroPiloto: pilot.numeroPiloto,
    fullName: pilot.fullName,
    teamName: teamByPilotId.get(pilot.pilotId) ?? 'Sin equipo',
    classificationPosition: pilot.position
  });

  const buildGroupGrid = (group: typeof standings): RaceGroupGrid => {
    const sortByQualy = (pilots: typeof group) =>
      [...pilots].sort((a, b) => {
        const timeA = qualyTimeByPilot.get(a.pilotId) ?? Number.POSITIVE_INFINITY;
        const timeB = qualyTimeByPilot.get(b.pilotId) ?? Number.POSITIVE_INFINITY;
        const diff = timeA - timeB;
        if (diff !== 0) {
          return diff;
        }
        return a.position - b.position;
      });

    const category390 = sortByQualy(group.filter((pilot) => pilotsById.get(pilot.pilotId)?.kart === '390cc')).map(mapPilot);
    const category270 = sortByQualy(group.filter((pilot) => pilotsById.get(pilot.pilotId)?.kart === '270cc')).map(mapPilot);

    return {
      category390,
      category270
    };
  };

  return {
    group1: buildGroupGrid(group1),
    group2: buildGroupGrid(group2)
  };
}

function isRaceGrid(value: unknown): value is RaceGrid {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as RaceGrid;
  return isRaceGroupGrid(candidate.group1) && isRaceGroupGrid(candidate.group2);
}

function isRaceGroupGrid(value: unknown): value is RaceGroupGrid {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as RaceGroupGrid;
  return Array.isArray(candidate.category390) && Array.isArray(candidate.category270);
}

function syncStoredRacesWithTeams(stored: StoredRaces, teamByPilotId: Map<string, string>): StoredRaces {
  const race1 = stored.race1 ? syncRaceGridTeamNames(stored.race1, teamByPilotId) : null;
  const race2 = stored.race2 ? syncRaceGridTeamNames(stored.race2, teamByPilotId) : null;

  if (race1 === stored.race1 && race2 === stored.race2) {
    return stored;
  }

  return {
    race1,
    race2
  };
}

function syncRaceGridTeamNames(grid: RaceGrid, teamByPilotId: Map<string, string>): RaceGrid {
  let changed = false;

  const updatePilot = (pilot: RacePilot): RacePilot => {
    const nextTeamName = teamByPilotId.get(pilot.pilotId) ?? 'Sin equipo';
    if (pilot.teamName === nextTeamName) {
      return pilot;
    }

    changed = true;
    return {
      ...pilot,
      teamName: nextTeamName
    };
  };

  const nextGroup1: RaceGroupGrid = {
    category390: grid.group1.category390.map(updatePilot),
    category270: grid.group1.category270.map(updatePilot)
  };
  const nextGroup2: RaceGroupGrid = {
    category390: grid.group2.category390.map(updatePilot),
    category270: grid.group2.category270.map(updatePilot)
  };

  if (!changed) {
    return grid;
  }

  return {
    group1: nextGroup1,
    group2: nextGroup2
  };
}
