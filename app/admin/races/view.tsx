'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { useClassification } from '@/context/ClassificationContext';
import { usePilots } from '@/context/PilotsContext';
import { useTimeAttackSessions } from '@/context/TimeAttackContext';
import { loadModuleState, saveModuleState } from '@/lib/eventStateClient';
import { useEventRuntimeConfig } from '@/lib/event-client';
import { buildCombinedStandings } from '@/lib/combinedStandings';
import { updateEventRuntimeConfigAction } from '@/app/admin/events/[eventId]/actions';

type RacePilot = {
  pilotId: string;
  numeroPiloto: number;
  fullName: string;
  teamName: string;
  classificationPosition: number;
  startPosition: number;
};

type RaceGroupGrid = {
  id: string;
  name: string;
  category390: RacePilot[];
  category270: RacePilot[];
};

type RaceGrid = {
  id: string;
  name: string;
  startTime: string;
  groups: RaceGroupGrid[];
};

type LegacyRaceGroupGrid = {
  category390: Array<Omit<RacePilot, 'startPosition'>>;
  category270: Array<Omit<RacePilot, 'startPosition'>>;
};

type LegacyRaceGrid = {
  group1: LegacyRaceGroupGrid;
  group2: LegacyRaceGroupGrid;
};

type RaceConfig = {
  raceCount: number;
  groupsPerRace: number;
  pilotsPerGroup: number;
  firstRaceStartTime: string;
  raceIntervalMinutes: number;
  splitMode: 'classification' | 'random' | 'level' | 'team' | 'kart';
  parity390: 'odd' | 'even';
};

type StoredRaces = {
  config: RaceConfig;
  races: RaceGrid[];
  race1: LegacyRaceGrid | null;
  race2: LegacyRaceGrid | null;
};

type TeamRecord = {
  id: string;
  name: string;
  members: string[];
};

const DEFAULT_CONFIG: RaceConfig = {
  raceCount: 2,
  groupsPerRace: 2,
  pilotsPerGroup: 8,
  firstRaceStartTime: '12:30',
  raceIntervalMinutes: 20,
  splitMode: 'classification',
  parity390: 'odd'
};

export default function RacesPage() {
  const { activeEventId, isHydrated: activeEventHydrated } = useActiveEvent();
  const runtimeConfig = useEventRuntimeConfig(activeEventId);
  const { pilots, isHydrated: pilotsHydrated } = usePilots();
  const { sessions, isHydrated: sessionsHydrated } = useTimeAttackSessions();
  const { qualyRecords, isHydrated: qualyHydrated } = useClassification();

  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [stored, setStored] = useState<StoredRaces>(() => ({
    config: DEFAULT_CONFIG,
    races: [],
    race1: null,
    race2: null
  }));
  const [configDraft, setConfigDraft] = useState<RaceConfig>(DEFAULT_CONFIG);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [feedback, setFeedback] = useState('');

  const combinedStandings = useMemo(
    () => buildCombinedStandings({ pilots, sessions, qualyRecords }),
    [pilots, sessions, qualyRecords]
  );

  const standingsWithPosition = useMemo(
    () => combinedStandings.map((item, index) => ({ ...item, position: index + 1 })),
    [combinedStandings]
  );

  const hasClassification = standingsWithPosition.length > 0;

  const pilotsById = useMemo(() => new Map(pilots.map((pilot) => [pilot.id, pilot])), [pilots]);

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
    if (!(pilotsHydrated && sessionsHydrated && qualyHydrated && activeEventHydrated)) {
      return;
    }

    setIsHydrated(false);

    void (async () => {
      try {
        const parsedTeams = await loadModuleState<TeamRecord[]>(activeEventId, 'teams', []);
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
        } else {
          setTeams([]);
        }

        const runtimeDefaultConfig = buildDefaultRaceConfig(runtimeConfig, pilots.length);
        const parsedStored = await loadModuleState<unknown>(activeEventId, 'races', null);
        const normalized = normalizeStoredRaces(parsedStored, runtimeDefaultConfig);

        setStored(normalized);
        setConfigDraft(normalized.config);
      } finally {
        setIsHydrated(true);
      }
    })();
  }, [pilotsHydrated, sessionsHydrated, qualyHydrated, activeEventHydrated, activeEventId, runtimeConfig, pilots.length]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void saveModuleState(activeEventId, 'races', stored);
  }, [isHydrated, stored, activeEventId]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    setStored((prev) => syncStoredRacesWithTeams(prev, teamByPilotId));
  }, [isHydrated, teamByPilotId]);

  const handleConfigChange = (field: keyof RaceConfig, value: string) => {
    setConfigDraft((prev) => {
      if (field === 'firstRaceStartTime' || field === 'splitMode' || field === 'parity390') {
        return {
          ...prev,
          [field]: value as RaceConfig[keyof RaceConfig]
        };
      }

      const numeric = Number(value);

      if (field === 'groupsPerRace') {
        const safeGroups = Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 0;
        const participantsCount = Math.max(standingsWithPosition.length, pilots.length, 1);
        const autoPilotsPerGroup = safeGroups > 0 ? Math.max(1, Math.ceil(participantsCount / safeGroups)) : 0;

        return {
          ...prev,
          groupsPerRace: safeGroups,
          pilotsPerGroup: autoPilotsPerGroup
        };
      }

      return {
        ...prev,
        [field]: Number.isFinite(numeric) ? numeric : 0
      };
    });
  };

  const handleGenerateRaces = () => {
    if (!hasClassification) {
      setFeedback('No hay clasificación conjunta disponible para generar parrillas.');
      return;
    }

    const validated = validateRaceConfig(configDraft, runtimeConfig?.raceCount ?? DEFAULT_CONFIG.raceCount);
    if (!validated.ok) {
      setFeedback(validated.message);
      return;
    }

    const races = buildRaceGrids(
      standingsWithPosition,
      teamByPilotId,
      pilotsById,
      qualyTimeByPilot,
      validated.config
    );

    setStored({
      config: validated.config,
      races,
      race1: toLegacyRaceGrid(races[0] ?? null),
      race2: toLegacyRaceGrid(races[1] ?? null)
    });

    void updateEventRuntimeConfigAction(activeEventId, {
      raceCount: validated.config.raceCount
    });

    setConfigDraft(validated.config);
    setFeedback('Parrillas generadas con la configuración actual.');
    setIsConfigOpen(false);
  };

  const handleResetRaces = () => {
    const validated = validateRaceConfig(configDraft, runtimeConfig?.raceCount ?? DEFAULT_CONFIG.raceCount);
    setStored({
      config: validated.ok ? validated.config : buildDefaultRaceConfig(runtimeConfig, pilots.length),
      races: [],
      race1: null,
      race2: null
    });
    setFeedback('Parrillas eliminadas. Estado reseteado.');
  };

  const handleRaceTimeChange = (raceId: string, startTime: string) => {
    if (!isValidTimeString(startTime)) {
      setFeedback('Hora inválida. Usa formato HH:mm.');
      return;
    }

    setStored((prev) => {
      const nextRaces = prev.races.map((race) => (race.id === raceId ? { ...race, startTime } : race));
      return {
        ...prev,
        races: nextRaces,
        race1: toLegacyRaceGrid(nextRaces[0] ?? null),
        race2: toLegacyRaceGrid(nextRaces[1] ?? null)
      };
    });
    setFeedback('Hora de carrera actualizada.');
  };

  const handlePilotStartPositionChange = (
    raceId: string,
    groupId: string,
    category: '390cc' | '270cc',
    pilotId: string,
    value: string
  ) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    setStored((prev) => {
      const nextRaces = prev.races.map((race) => {
        if (race.id !== raceId) {
          return race;
        }

        return {
          ...race,
          groups: race.groups.map((group) => {
            if (group.id !== groupId) {
              return group;
            }

            const nextCategoryPilots = (category === '390cc' ? group.category390 : group.category270).map((pilot) =>
              pilot.pilotId === pilotId
                ? {
                    ...pilot,
                    startPosition: Math.floor(parsed)
                  }
                : pilot
            );

            return category === '390cc'
              ? { ...group, category390: nextCategoryPilots }
              : { ...group, category270: nextCategoryPilots };
          })
        };
      });

      return {
        ...prev,
        races: nextRaces,
        race1: toLegacyRaceGrid(nextRaces[0] ?? null),
        race2: toLegacyRaceGrid(nextRaces[1] ?? null)
      };
    });
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
                      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.14em] text-white">PARRILLAS DE CARRERA CONFIGURABLES</h1>
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
                      onClick={() => {
                        setConfigDraft(stored.config);
                        setIsConfigOpen(true);
                      }}
                      disabled={!isHydrated || !hasClassification}
                      className="rounded-xl border border-gp-racingRed/55 bg-gp-racingRed/[0.18] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-red-100 transition-all duration-200 hover:bg-gp-racingRed/[0.28] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Configurar y generar parrillas
                    </button>

                    <button
                      type="button"
                      onClick={handleResetRaces}
                      disabled={!isHydrated || stored.races.length === 0}
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

                {isConfigOpen ? (
                  <article className="rounded-2xl border border-gp-racingRed/45 bg-[rgba(34,18,22,0.78)] p-5 shadow-panel-deep backdrop-blur-xl">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">Formulario de generación</p>
                        <h2 className="mt-1 text-2xl font-semibold uppercase tracking-[0.14em] text-white">Configurar parrillas</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsConfigOpen(false)}
                        className="rounded-lg border border-white/20 bg-white/[0.05] px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-gp-textSoft transition-colors hover:border-white/35 hover:text-white"
                      >
                        Cerrar
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                      <LabeledNumber
                        label="Cantidad carreras"
                        value={String(configDraft.raceCount)}
                        onChange={(value) => handleConfigChange('raceCount', value)}
                        min={1}
                      />
                      <LabeledNumber
                        label="Grupos por carrera"
                        value={String(configDraft.groupsPerRace)}
                        onChange={(value) => handleConfigChange('groupsPerRace', value)}
                        min={1}
                      />
                      <LabeledNumber
                        label="Pilotos por grupo"
                        value={String(configDraft.pilotsPerGroup)}
                        onChange={(value) => handleConfigChange('pilotsPerGroup', value)}
                        min={1}
                      />
                      <LabeledTime
                        label="Hora primera carrera"
                        value={configDraft.firstRaceStartTime}
                        onChange={(value) => handleConfigChange('firstRaceStartTime', value)}
                      />
                      <LabeledNumber
                        label="Intervalo (min)"
                        value={String(configDraft.raceIntervalMinutes)}
                        onChange={(value) => handleConfigChange('raceIntervalMinutes', value)}
                        min={1}
                      />
                      <LabeledSelect
                        label="Reparto grupos"
                        value={configDraft.splitMode}
                        onChange={(value) => handleConfigChange('splitMode', value)}
                        options={[
                          { value: 'classification', label: 'Por clasificación' },
                          { value: 'random', label: 'Random' },
                          { value: 'level', label: 'Por niveles' },
                          { value: 'team', label: 'Por equipo' },
                          { value: 'kart', label: 'Por kart' }
                        ]}
                      />
                      <LabeledSelect
                        label="390cc en"
                        value={configDraft.parity390}
                        onChange={(value) => handleConfigChange('parity390', value)}
                        options={[
                          { value: 'odd', label: 'Posiciones impares' },
                          { value: 'even', label: 'Posiciones pares' }
                        ]}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateRaces}
                        className="rounded-xl border border-gp-racingRed/55 bg-gp-racingRed/[0.18] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-red-100 transition-all duration-200 hover:bg-gp-racingRed/[0.28] hover:text-white"
                      >
                        Generar ahora
                      </button>
                    </div>
                  </article>
                ) : null}

                <div className="space-y-5">
                  {stored.races.length === 0 ? (
                    <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 text-center text-xs uppercase tracking-[0.14em] text-gp-textSoft shadow-panel-deep backdrop-blur-xl">
                      No hay parrillas generadas.
                    </article>
                  ) : (
                    stored.races.map((race, index) => (
                      <RaceGridPanel
                        key={race.id}
                        race={race}
                        raceIndex={index}
                        onRaceTimeChange={handleRaceTimeChange}
                        onPilotStartPositionChange={handlePilotStartPositionChange}
                      />
                    ))
                  )}
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
  race,
  raceIndex,
  onRaceTimeChange,
  onPilotStartPositionChange
}: {
  race: RaceGrid;
  raceIndex: number;
  onRaceTimeChange: (raceId: string, startTime: string) => void;
  onPilotStartPositionChange: (
    raceId: string,
    groupId: string,
    category: '390cc' | '270cc',
    pilotId: string,
    value: string
  ) => void;
}) {
  const advantageCategory = raceIndex % 2 === 0 ? '270cc' : '390cc';

  return (
    <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-4 shadow-panel-deep backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-gp-textSoft">{race.id.toUpperCase()}</p>
          <h2 className="mt-1 text-2xl font-semibold uppercase tracking-[0.13em] text-white">{race.name}</h2>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">Hora carrera</label>
          <input
            type="time"
            value={race.startTime}
            onChange={(event) => onRaceTimeChange(race.id, event.target.value)}
            className="rounded-lg border border-white/20 bg-[rgba(17,24,38,0.75)] px-3 py-2 text-xs text-white outline-none transition-colors focus:border-gp-telemetryBlue/55"
          />
        </div>
      </div>

      <div className="mt-3 h-px w-full bg-gradient-to-r from-gp-racingRed/70 via-gp-telemetryBlue/50 to-transparent" />

      <div className="mt-4 space-y-4">
        {race.groups.map((group) => (
          <GroupSection
            key={group.id}
            raceId={race.id}
            grid={group}
            advantageCategory={advantageCategory}
            onPilotStartPositionChange={onPilotStartPositionChange}
          />
        ))}
      </div>
    </article>
  );
}

function GroupSection({
  raceId,
  grid,
  advantageCategory,
  onPilotStartPositionChange
}: {
  raceId: string;
  grid: RaceGroupGrid;
  advantageCategory: '390cc' | '270cc';
  onPilotStartPositionChange: (
    raceId: string,
    groupId: string,
    category: '390cc' | '270cc',
    pilotId: string,
    value: string
  ) => void;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white">{grid.name}</p>
        <span className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">
          {grid.category390.length + grid.category270.length} pilotos
        </span>
      </div>

      <div className="space-y-3">
        <CategorySection
          raceId={raceId}
          groupId={grid.id}
          title="390cc"
          pilots={grid.category390}
          showAdvantage={advantageCategory === '390cc'}
          onPilotStartPositionChange={onPilotStartPositionChange}
        />
        <CategorySection
          raceId={raceId}
          groupId={grid.id}
          title="270cc"
          pilots={grid.category270}
          showAdvantage={advantageCategory === '270cc'}
          onPilotStartPositionChange={onPilotStartPositionChange}
        />
      </div>
    </section>
  );
}

function CategorySection({
  raceId,
  groupId,
  title,
  pilots,
  showAdvantage,
  onPilotStartPositionChange
}: {
  raceId: string;
  groupId: string;
  title: '390cc' | '270cc';
  pilots: RacePilot[];
  showAdvantage: boolean;
  onPilotStartPositionChange: (
    raceId: string,
    groupId: string,
    category: '390cc' | '270cc',
    pilotId: string,
    value: string
  ) => void;
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
            {pilots.map((pilot) => (
              <tr key={`${title}-${pilot.pilotId}`} className="border-t border-white/10 bg-white/[0.01]">
                <td className="px-3 py-2.5 text-sm font-semibold text-white">
                  <input
                    type="number"
                    min={1}
                    value={pilot.startPosition}
                    onChange={(event) =>
                      onPilotStartPositionChange(raceId, groupId, title, pilot.pilotId, event.target.value)
                    }
                    className="w-20 rounded-md border border-white/20 bg-[rgba(17,24,38,0.75)] px-2 py-1 text-xs text-white outline-none transition-colors focus:border-gp-telemetryBlue/55"
                  />
                </td>
                <td className="px-3 py-2.5 text-sm font-semibold text-cyan-200">#{String(pilot.numeroPiloto).padStart(2, '0')}</td>
                <td className="px-3 py-2.5 text-sm font-medium uppercase tracking-[0.08em] text-white">
                  {pilot.fullName}
                  <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gp-textSoft">
                    (Clasif. P{pilot.classificationPosition})
                  </span>
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

function LabeledNumber({
  label,
  value,
  onChange,
  min
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">{label}</label>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-white/20 bg-[rgba(17,24,38,0.75)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-gp-telemetryBlue/55"
      />
    </div>
  );
}

function LabeledTime({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">{label}</label>
      <input
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-white/20 bg-[rgba(17,24,38,0.75)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-gp-telemetryBlue/55"
      />
    </div>
  );
}

function LabeledSelect({
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
    <div className="space-y-1">
      <label className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-white/20 bg-[rgba(17,24,38,0.75)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-gp-telemetryBlue/55"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#111826] text-white">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function buildRaceGrids(
  standings: Array<{
    pilotId: string;
    numeroPiloto: number;
    fullName: string;
    position: number;
  }>,
  teamByPilotId: Map<string, string>,
  pilotsById: Map<string, { kart: '390cc' | '270cc' }>,
  qualyTimeByPilot: Map<string, number>,
  config: RaceConfig
): RaceGrid[] {
  const totalSlots = config.groupsPerRace * config.pilotsPerGroup;
  const selected = standings.slice(0, totalSlots);
  const arranged = arrangePilotsForGroups(selected, config.splitMode, teamByPilotId, pilotsById);

  return Array.from({ length: config.raceCount }, (_, raceIndex) => {
    const raceStartTime = buildClockTime(config.firstRaceStartTime, raceIndex * config.raceIntervalMinutes);

    const groups = Array.from({ length: config.groupsPerRace }, (_, groupIndex) => {
      const start = groupIndex * config.pilotsPerGroup;
      const groupStandings = arranged.slice(start, start + config.pilotsPerGroup);

      const mapPilot = (pilot: (typeof groupStandings)[number], startPosition: number): RacePilot => ({
        pilotId: pilot.pilotId,
        numeroPiloto: pilot.numeroPiloto,
        fullName: pilot.fullName,
        teamName: teamByPilotId.get(pilot.pilotId) ?? 'Sin equipo',
        classificationPosition: pilot.position,
        startPosition
      });

      const sortByQualy = (pilots: typeof groupStandings) =>
        [...pilots].sort((a, b) => {
          const timeA = qualyTimeByPilot.get(a.pilotId) ?? Number.POSITIVE_INFINITY;
          const timeB = qualyTimeByPilot.get(b.pilotId) ?? Number.POSITIVE_INFINITY;
          const diff = timeA - timeB;
          if (diff !== 0) {
            return diff;
          }
          return a.position - b.position;
        });

      const category390Source = sortByQualy(groupStandings.filter((pilot) => pilotsById.get(pilot.pilotId)?.kart === '390cc'));
      const category270Source = sortByQualy(groupStandings.filter((pilot) => pilotsById.get(pilot.pilotId)?.kart === '270cc'));

      const starts390 = config.parity390 === 'odd' ? 1 : 2;
      const starts270 = config.parity390 === 'odd' ? 2 : 1;

      const category390 = category390Source.map((pilot, index) => mapPilot(pilot, starts390 + index * 2));
      const category270 = category270Source.map((pilot, index) => mapPilot(pilot, starts270 + index * 2));

      return {
        id: `race-${raceIndex + 1}-group-${groupIndex + 1}`,
        name: `Grupo ${groupIndex + 1}`,
        category390,
        category270
      };
    });

    return {
      id: `race${raceIndex + 1}`,
      name: `Carrera ${raceIndex + 1}`,
      startTime: raceStartTime,
      groups
    };
  });
}

function toLegacyRaceGrid(race: RaceGrid | null): LegacyRaceGrid | null {
  if (!race) {
    return null;
  }

  const group1 = race.groups[0] ?? { id: 'g1', name: 'Grupo 1', category390: [], category270: [] };
  const group2 = race.groups[1] ?? { id: 'g2', name: 'Grupo 2', category390: [], category270: [] };

  return {
    group1: {
      category390: group1.category390.map(stripStartPosition),
      category270: group1.category270.map(stripStartPosition)
    },
    group2: {
      category390: group2.category390.map(stripStartPosition),
      category270: group2.category270.map(stripStartPosition)
    }
  };
}

function stripStartPosition(pilot: RacePilot): Omit<RacePilot, 'startPosition'> {
  const { startPosition: _ignored, ...rest } = pilot;
  return rest;
}

function syncStoredRacesWithTeams(stored: StoredRaces, teamByPilotId: Map<string, string>): StoredRaces {
  const nextRaces = stored.races.map((race) => syncRaceGridTeamNames(race, teamByPilotId));

  const changed = nextRaces.some((race, index) => race !== stored.races[index]);
  if (!changed) {
    return stored;
  }

  return {
    ...stored,
    races: nextRaces,
    race1: toLegacyRaceGrid(nextRaces[0] ?? null),
    race2: toLegacyRaceGrid(nextRaces[1] ?? null)
  };
}

function syncRaceGridTeamNames(race: RaceGrid, teamByPilotId: Map<string, string>): RaceGrid {
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

  const nextGroups = race.groups.map((group) => ({
    ...group,
    category390: group.category390.map(updatePilot),
    category270: group.category270.map(updatePilot)
  }));

  if (!changed) {
    return race;
  }

  return {
    ...race,
    groups: nextGroups
  };
}

function normalizeStoredRaces(value: unknown, fallbackConfig: RaceConfig): StoredRaces {
  if (!value || typeof value !== 'object') {
    return {
      config: fallbackConfig,
      races: [],
      race1: null,
      race2: null
    };
  }

  const candidate = value as Partial<StoredRaces>;
  const config = parseRaceConfig(candidate.config, fallbackConfig);

  const races = Array.isArray(candidate.races)
    ? candidate.races.filter(isDynamicRaceGrid)
    : [];

  if (races.length > 0) {
    return {
      config,
      races,
      race1: toLegacyRaceGrid(races[0] ?? null),
      race2: toLegacyRaceGrid(races[1] ?? null)
    };
  }

  const race1 = isLegacyRaceGrid(candidate.race1) ? candidate.race1 : null;
  const race2 = isLegacyRaceGrid(candidate.race2) ? candidate.race2 : null;

  const migrated = [
    race1 ? legacyToDynamicRace('race1', 'Carrera 1', config.firstRaceStartTime, race1) : null,
    race2 ? legacyToDynamicRace('race2', 'Carrera 2', buildClockTime(config.firstRaceStartTime, config.raceIntervalMinutes), race2) : null
  ].filter((item): item is RaceGrid => Boolean(item));

  return {
    config,
    races: migrated,
    race1,
    race2
  };
}

function legacyToDynamicRace(id: string, name: string, startTime: string, legacy: LegacyRaceGrid): RaceGrid {
  return {
    id,
    name,
    startTime,
    groups: [
      {
        id: `${id}-group-1`,
        name: 'Grupo 1',
        category390: legacy.group1.category390.map((pilot, index) => ({ ...pilot, startPosition: 1 + index * 2 })),
        category270: legacy.group1.category270.map((pilot, index) => ({ ...pilot, startPosition: 2 + index * 2 }))
      },
      {
        id: `${id}-group-2`,
        name: 'Grupo 2',
        category390: legacy.group2.category390.map((pilot, index) => ({ ...pilot, startPosition: 1 + index * 2 })),
        category270: legacy.group2.category270.map((pilot, index) => ({ ...pilot, startPosition: 2 + index * 2 }))
      }
    ]
  };
}

function buildDefaultRaceConfig(
  runtimeConfig: { raceCount: number; maxPilots: number } | null,
  pilotsCount: number
): RaceConfig {
  const raceCount = sanitizePositive(runtimeConfig?.raceCount, DEFAULT_CONFIG.raceCount);
  const groupsPerRace = DEFAULT_CONFIG.groupsPerRace;
  const participants = sanitizePositive(runtimeConfig?.maxPilots, pilotsCount || DEFAULT_CONFIG.pilotsPerGroup * groupsPerRace);
  const pilotsPerGroup = Math.max(1, Math.ceil(participants / groupsPerRace));

  return {
    ...DEFAULT_CONFIG,
    raceCount,
    groupsPerRace,
    pilotsPerGroup
  };
}

function validateRaceConfig(
  draft: RaceConfig,
  fallbackRaceCount: number
): { ok: true; config: RaceConfig } | { ok: false; message: string } {
  const raceCount = sanitizePositive(draft.raceCount, fallbackRaceCount);
  const groupsPerRace = sanitizePositive(draft.groupsPerRace, DEFAULT_CONFIG.groupsPerRace);
  const pilotsPerGroup = sanitizePositive(draft.pilotsPerGroup, DEFAULT_CONFIG.pilotsPerGroup);
  const raceIntervalMinutes = sanitizePositive(draft.raceIntervalMinutes, DEFAULT_CONFIG.raceIntervalMinutes);

  if (!isValidTimeString(draft.firstRaceStartTime)) {
    return { ok: false, message: 'Hora de primera carrera inválida. Usa formato HH:mm.' };
  }

  return {
    ok: true,
    config: {
      raceCount,
      groupsPerRace,
      pilotsPerGroup,
      firstRaceStartTime: draft.firstRaceStartTime,
      raceIntervalMinutes,
      splitMode: isValidSplitMode(draft.splitMode) ? draft.splitMode : DEFAULT_CONFIG.splitMode,
      parity390: draft.parity390 === 'even' ? 'even' : 'odd'
    }
  };
}

function parseRaceConfig(value: unknown, fallback: RaceConfig): RaceConfig {
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const candidate = value as Partial<RaceConfig>;

  return {
    raceCount: sanitizePositive(candidate.raceCount, fallback.raceCount),
    groupsPerRace: sanitizePositive(candidate.groupsPerRace, fallback.groupsPerRace),
    pilotsPerGroup: sanitizePositive(candidate.pilotsPerGroup, fallback.pilotsPerGroup),
    firstRaceStartTime: isValidTimeString(candidate.firstRaceStartTime) ? candidate.firstRaceStartTime : fallback.firstRaceStartTime,
    raceIntervalMinutes: sanitizePositive(candidate.raceIntervalMinutes, fallback.raceIntervalMinutes),
    splitMode: isValidSplitMode(candidate.splitMode) ? candidate.splitMode : fallback.splitMode,
    parity390: candidate.parity390 === 'even' ? 'even' : fallback.parity390
  };
}

function arrangePilotsForGroups(
  pilots: Array<{ pilotId: string; numeroPiloto: number; fullName: string; position: number }>,
  mode: RaceConfig['splitMode'],
  teamByPilotId: Map<string, string>,
  pilotsById: Map<string, { kart: '390cc' | '270cc'; nivel?: 'PRO' | 'AMATEUR' | 'PRINCIPIANTE' }>
) {
  if (mode === 'random') {
    return shufflePilots(pilots);
  }

  if (mode === 'level') {
    const priority: Record<'PRO' | 'AMATEUR' | 'PRINCIPIANTE', number> = {
      PRO: 0,
      AMATEUR: 1,
      PRINCIPIANTE: 2
    };

    return [...pilots].sort((a, b) => {
      const levelA = pilotsById.get(a.pilotId)?.nivel ?? 'PRINCIPIANTE';
      const levelB = pilotsById.get(b.pilotId)?.nivel ?? 'PRINCIPIANTE';
      const diff = priority[levelA] - priority[levelB];
      if (diff !== 0) return diff;
      return a.position - b.position;
    });
  }

  if (mode === 'kart') {
    return [...pilots].sort((a, b) => {
      const kartA = pilotsById.get(a.pilotId)?.kart ?? '270cc';
      const kartB = pilotsById.get(b.pilotId)?.kart ?? '270cc';
      const diff = kartA === kartB ? 0 : kartA === '390cc' ? -1 : 1;
      if (diff !== 0) return diff;
      return a.position - b.position;
    });
  }

  if (mode === 'team') {
    const buckets = new Map<string, Array<(typeof pilots)[number]>>();
    pilots.forEach((pilot) => {
      const team = teamByPilotId.get(pilot.pilotId) ?? 'Sin equipo';
      const list = buckets.get(team) ?? [];
      list.push(pilot);
      buckets.set(team, list);
    });

    const orderedTeams = Array.from(buckets.keys()).sort();
    const flattened: Array<(typeof pilots)[number]> = [];
    let keepGoing = true;

    while (keepGoing) {
      keepGoing = false;
      orderedTeams.forEach((team) => {
        const list = buckets.get(team) ?? [];
        const next = list.shift();
        if (next) {
          flattened.push(next);
          keepGoing = true;
        }
      });
    }

    return flattened;
  }

  return pilots;
}

function shufflePilots<T>(list: T[]) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function isValidSplitMode(value: unknown): value is RaceConfig['splitMode'] {
  return value === 'classification' || value === 'random' || value === 'level' || value === 'team' || value === 'kart';
}

function isDynamicRaceGrid(value: unknown): value is RaceGrid {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as RaceGrid;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.startTime === 'string' &&
    Array.isArray(candidate.groups)
  );
}

function isLegacyRaceGrid(value: unknown): value is LegacyRaceGrid {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as LegacyRaceGrid;
  return isLegacyRaceGroupGrid(candidate.group1) && isLegacyRaceGroupGrid(candidate.group2);
}

function isLegacyRaceGroupGrid(value: unknown): value is LegacyRaceGroupGrid {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as LegacyRaceGroupGrid;
  return Array.isArray(candidate.category390) && Array.isArray(candidate.category270);
}

function sanitizePositive(value: number | undefined, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.floor(value);
}

function isValidTimeString(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function buildClockTime(base: string, plusMinutes: number) {
  const [hourPart, minutePart] = base.split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  const total = (Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : 0) + plusMinutes;
  const endHour = Math.floor(total / 60) % 24;
  const endMinute = total % 60;
  return `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
}
