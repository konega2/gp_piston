'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { loadEventStorageItem } from '@/lib/eventStorage';
import {
  EMPTY_RACE_RESULT,
  buildIndividualStandings,
  buildTeamStandings,
  isRaceGrid,
  normalizeRaceResult,
  type RaceGrid,
  type RaceComputedResult,
  type StoredResults,
  type TeamRecord
} from '@/lib/resultsEngine';

const RESULTS_STORAGE_KEY = 'results';
const TEAMS_STORAGE_KEY = 'teams';
const RACES_STORAGE_KEY = 'races';

type StoredRaces = {
  race1: RaceGrid | null;
  race2: RaceGrid | null;
};

export default function ResultsStandingsPage() {
  const { activeEventId, isHydrated: activeEventHydrated } = useActiveEvent();
  const [results, setResults] = useState<StoredResults>({ race1: EMPTY_RACE_RESULT, race2: EMPTY_RACE_RESULT });
  const [races, setRaces] = useState<StoredRaces>({ race1: null, race2: null });
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!activeEventHydrated) {
      return;
    }

    setIsHydrated(false);

    try {
      const rawResults = loadEventStorageItem(RESULTS_STORAGE_KEY, activeEventId);
      if (rawResults) {
        const parsedResults = JSON.parse(rawResults) as StoredResults;
        setResults({
          race1: normalizeRaceResult(parsedResults?.race1),
          race2: normalizeRaceResult(parsedResults?.race2)
        });
      } else {
        setResults({ race1: EMPTY_RACE_RESULT, race2: EMPTY_RACE_RESULT });
      }

      const rawRaces = loadEventStorageItem(RACES_STORAGE_KEY, activeEventId);
      if (rawRaces) {
        const parsedRaces = JSON.parse(rawRaces) as StoredRaces;
        setRaces({
          race1: isRaceGrid(parsedRaces?.race1) ? parsedRaces.race1 : null,
          race2: isRaceGrid(parsedRaces?.race2) ? parsedRaces.race2 : null
        });
      } else {
        setRaces({ race1: null, race2: null });
      }

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
    } finally {
      setIsHydrated(true);
    }
  }, [activeEventHydrated, activeEventId]);

  const race1Entries = useMemo(
    () => [...results.race1.entries].sort((a, b) => a.finalPosition - b.finalPosition),
    [results.race1.entries]
  );

  const race2Entries = useMemo(
    () => [...results.race2.entries].sort((a, b) => a.finalPosition - b.finalPosition),
    [results.race2.entries]
  );

  const race1ByGroup = useMemo(() => splitEntriesByGroup(race1Entries, races.race1), [race1Entries, races.race1]);
  const race2ByGroup = useMemo(() => splitEntriesByGroup(race2Entries, races.race2), [race2Entries, races.race2]);

  const individualStandings = useMemo(() => buildIndividualStandings(results), [results]);
  const teamStandings = useMemo(() => buildTeamStandings(results, teams), [results, teams]);

  return (
    <main className="min-h-screen bg-gp-bg text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar activeItem="results" />

        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(0,207,255,0.09),transparent_42%),radial-gradient(circle_at_85%_18%,rgba(225,6,0,0.08),transparent_40%),linear-gradient(to_bottom,#0A0F16,#0A0F16)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-size:11px_11px] [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />

          <div className="relative z-10">
            <Header title="RESULTS" subtitle="Resultados oficiales del evento" />

            <section className="px-5 py-6 sm:px-6">
              <div className="mx-auto max-w-7xl space-y-5">
                <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">MODO 02</p>
                      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.14em] text-white">VER RESULTADOS OFICIALES</h1>
                    </div>

                    <Link
                      href={`/admin/events/${activeEventId}/results`}
                      className="inline-flex items-center gap-2 rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition-colors duration-200 hover:bg-gp-telemetryBlue/20"
                    >
                      <span aria-hidden>←</span>
                      Volver a Results
                    </Link>
                  </div>

                  <div className="mt-4 h-px w-full bg-gradient-to-r from-gp-racingRed/80 via-gp-telemetryBlue/55 to-transparent" />
                </article>

                <RaceOfficialByGroup
                  title="Carrera 1"
                  grouped={race1ByGroup}
                  combined={race1Entries}
                  hydrated={isHydrated}
                />
                <RaceOfficialByGroup
                  title="Carrera 2"
                  grouped={race2ByGroup}
                  combined={race2Entries}
                  hydrated={isHydrated}
                />

                <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                  <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">CLASIFICACIÓN GENERAL INDIVIDUAL</p>
                  <h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.14em] text-white">Ranking por puntos acumulados</h2>
                  <div className="mt-3 h-px w-full bg-gradient-to-r from-gp-racingRed/80 via-gp-telemetryBlue/55 to-transparent" />

                  {!isHydrated || individualStandings.length === 0 ? (
                    <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-xs uppercase tracking-[0.13em] text-gp-textSoft">
                      Sin resultados disponibles para clasificación general.
                    </div>
                  ) : (
                    <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
                      <table className="w-full text-sm">
                        <thead className="bg-white/[0.03]">
                          <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">
                            <th className="px-3 py-2.5">Posición</th>
                            <th className="px-3 py-2.5">Número</th>
                            <th className="px-3 py-2.5">Nombre</th>
                            <th className="px-3 py-2.5">Puntos C1</th>
                            <th className="px-3 py-2.5">Puntos C2</th>
                            <th className="px-3 py-2.5">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {individualStandings.map((entry, index) => (
                            <tr key={entry.pilotId} className="border-t border-white/10 bg-white/[0.01]">
                              <td className="px-3 py-2.5 text-sm font-semibold text-white">P{index + 1}</td>
                              <td className="px-3 py-2.5 text-sm font-semibold text-cyan-200">#{String(entry.numeroPiloto).padStart(2, '0')}</td>
                              <td className="px-3 py-2.5 text-sm font-medium uppercase tracking-[0.08em] text-white">{entry.fullName}</td>
                              <td className="px-3 py-2.5 text-sm font-semibold text-cyan-200">{entry.pointsRace1}</td>
                              <td className="px-3 py-2.5 text-sm font-semibold text-cyan-200">{entry.pointsRace2}</td>
                              <td className="px-3 py-2.5 text-sm font-semibold text-white">{entry.totalPoints}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>

                <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                  <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">RANKING POR EQUIPOS</p>
                  <h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.14em] text-white">Puntuación total por equipo</h2>
                  <div className="mt-3 h-px w-full bg-gradient-to-r from-gp-racingRed/80 via-gp-telemetryBlue/55 to-transparent" />

                  {!isHydrated || teamStandings.length === 0 ? (
                    <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-xs uppercase tracking-[0.13em] text-gp-textSoft">
                      Sin datos suficientes para ranking por equipos.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {teamStandings.map((team, index) => (
                        <article key={team.teamId} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-lg font-semibold uppercase tracking-[0.12em] text-white">
                              #{index + 1} · {team.teamName}
                            </h3>
                            <span className="rounded-full border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
                              {team.totalPoints} pts
                            </span>
                          </div>

                          <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
                            <table className="w-full text-sm">
                              <thead className="bg-white/[0.03]">
                                <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">
                                  <th className="px-3 py-2.5">Piloto</th>
                                  <th className="px-3 py-2.5">Carrera 1</th>
                                  <th className="px-3 py-2.5">Carrera 2</th>
                                  <th className="px-3 py-2.5">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {team.breakdown.map((entry) => (
                                  <tr key={`${team.teamId}-${entry.pilotId}`} className="border-t border-white/10 bg-white/[0.01]">
                                    <td className="px-3 py-2.5 text-sm font-medium uppercase tracking-[0.08em] text-white">
                                      #{String(entry.numeroPiloto).padStart(2, '0')} {entry.fullName}
                                    </td>
                                    <td className="px-3 py-2.5 text-sm font-semibold text-cyan-200">{entry.race1Points}</td>
                                    <td className="px-3 py-2.5 text-sm font-semibold text-cyan-200">{entry.race2Points}</td>
                                    <td className="px-3 py-2.5 text-sm font-semibold text-white">{entry.totalPoints}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </article>
                      ))}
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

function RaceOfficialByGroup({
  title,
  grouped,
  combined,
  hydrated
}: {
  title: string;
  grouped: { group1: RaceComputedResult['entries']; group2: RaceComputedResult['entries'] };
  combined: RaceComputedResult['entries'];
  hydrated: boolean;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">{title.toUpperCase()}</p>
      <h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.14em] text-white">{title}</h2>
      <div className="mt-3 h-px w-full bg-gradient-to-r from-gp-racingRed/80 via-gp-telemetryBlue/55 to-transparent" />

      {!hydrated || combined.length === 0 ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-xs uppercase tracking-[0.13em] text-gp-textSoft">
          Sin resultados calculados para {title}.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <RaceOfficialTable title="Grupo 1" entries={grouped.group1} />
          <RaceOfficialTable title="Grupo 2" entries={grouped.group2} />
          <RaceOfficialTable title="Conjunta" entries={combined} />
        </div>
      )}
    </article>
  );
}

function RaceOfficialTable({ title, entries }: { title: string; entries: RaceComputedResult['entries'] }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white">{title}</p>
        <span className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">{entries.length} pilotos</span>
      </div>
      <div className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03]">
            <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">
              <th className="px-3 py-2.5">Posición</th>
              <th className="px-3 py-2.5">Número piloto</th>
              <th className="px-3 py-2.5">Nombre</th>
              <th className="px-3 py-2.5">Categoría</th>
              <th className="px-3 py-2.5">Puntos base</th>
              <th className="px-3 py-2.5">Bonus colectivo</th>
              <th className="px-3 py-2.5">Bonus individual</th>
              <th className="px-3 py-2.5">Total carrera</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={`${title}-${entry.pilotId}-${entry.finalPosition}`} className="border-t border-white/10 bg-white/[0.01]">
                <td className="px-3 py-2.5 text-sm font-semibold text-white">P{entry.finalPosition}</td>
                <td className="px-3 py-2.5 text-sm font-semibold text-cyan-200">#{String(entry.numeroPiloto).padStart(2, '0')}</td>
                <td className="px-3 py-2.5 text-sm font-medium uppercase tracking-[0.08em] text-white">{entry.fullName}</td>
                <td className="px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-gp-textSoft">{entry.category}</td>
                <td className="px-3 py-2.5 text-sm font-semibold text-cyan-200">{entry.basePoints}</td>
                <td className="px-3 py-2.5 text-sm font-semibold text-green-200">+{entry.collectiveBonus}</td>
                <td className="px-3 py-2.5 text-sm font-semibold text-amber-200">+{entry.individualBonus}</td>
                <td className="px-3 py-2.5 text-sm font-semibold text-white">{entry.finalPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function splitEntriesByGroup(entries: RaceComputedResult['entries'], grid: RaceGrid | null) {
  if (!grid) {
    return {
      group1: [] as RaceComputedResult['entries'],
      group2: [] as RaceComputedResult['entries']
    };
  }

  const group1PilotIds = new Set([
    ...grid.group1.category390.map((pilot) => pilot.pilotId),
    ...grid.group1.category270.map((pilot) => pilot.pilotId)
  ]);

  const group2PilotIds = new Set([
    ...grid.group2.category390.map((pilot) => pilot.pilotId),
    ...grid.group2.category270.map((pilot) => pilot.pilotId)
  ]);

  return {
    group1: entries.filter((entry) => group1PilotIds.has(entry.pilotId)),
    group2: entries.filter((entry) => group2PilotIds.has(entry.pilotId))
  };
}
