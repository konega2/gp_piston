export type RacePilot = {
  pilotId: string;
  numeroPiloto: number;
  fullName: string;
  teamName: string;
  classificationPosition: number;
  startPosition: number;
};

export type RaceGroupGrid = {
  id: string;
  name: string;
  category390: RacePilot[];
  category270: RacePilot[];
};

export type RaceGrid = {
  id: string;
  name: string;
  startTime: string;
  groups: RaceGroupGrid[];
};

export type LegacyRaceGroupGrid = {
  category390: Array<Omit<RacePilot, 'startPosition'>>;
  category270: Array<Omit<RacePilot, 'startPosition'>>;
};

export type LegacyRaceGrid = {
  group1: LegacyRaceGroupGrid;
  group2: LegacyRaceGroupGrid;
};

export type RaceConfig = {
  raceCount: number;
  groupsPerRace: number;
  pilotsPerGroup: number;
  firstRaceStartTime: string;
  raceIntervalMinutes: number;
  splitMode: 'classification' | 'random' | 'level' | 'team' | 'kart';
  parity390: 'odd' | 'even';
};

type ArrangePilot = {
  pilotId: string;
  numeroPiloto: number;
  fullName: string;
  position: number;
};

export function buildRaceGrids(
  standings: ArrangePilot[],
  teamByPilotId: Map<string, string>,
  pilotsById: Map<string, { kart: '390cc' | '270cc'; nivel?: 'PRO' | 'AMATEUR' | 'PRINCIPIANTE' }>,
  qualyTimeByPilot: Map<string, number>,
  config: RaceConfig,
  seed = 1
): RaceGrid[] {
  const totalSlots = config.groupsPerRace * config.pilotsPerGroup;
  const selected = standings.slice(0, totalSlots);
  const arranged = arrangePilotsForGroups(selected, config.splitMode, teamByPilotId, pilotsById, seed);

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

export function toLegacyRaceGrid(race: RaceGrid | null): LegacyRaceGrid | null {
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

export function buildClockTime(base: string, plusMinutes: number) {
  const [hourPart, minutePart] = base.split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  const total = (Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : 0) + plusMinutes;
  const endHour = Math.floor(total / 60) % 24;
  const endMinute = total % 60;
  return `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
}

function stripStartPosition(pilot: RacePilot): Omit<RacePilot, 'startPosition'> {
  const { startPosition: _ignored, ...rest } = pilot;
  return rest;
}

function arrangePilotsForGroups(
  pilots: ArrangePilot[],
  mode: RaceConfig['splitMode'],
  teamByPilotId: Map<string, string>,
  pilotsById: Map<string, { kart: '390cc' | '270cc'; nivel?: 'PRO' | 'AMATEUR' | 'PRINCIPIANTE' }>,
  seed: number
) {
  if (mode === 'random') {
    return shufflePilots(pilots, seed);
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

function shufflePilots<T>(list: T[], seed: number) {
  const next = [...list];
  const random = createSeededRandom(seed);
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function createSeededRandom(seed: number) {
  let state = (seed | 0) ^ 0x9e3779b9;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}
