export type RaceKey = 'race1' | 'race2';
export type RaceCategory = '390cc' | '270cc';

export type RacePilot = {
  pilotId: string;
  numeroPiloto: number;
  fullName: string;
  teamName: string;
  classificationPosition: number;
};

export type RaceGroupGrid = {
  category390: RacePilot[];
  category270: RacePilot[];
};

export type RaceGrid = {
  group1: RaceGroupGrid;
  group2: RaceGroupGrid;
};

export type RaceResultEntry = {
  race: RaceKey;
  pilotId: string;
  numeroPiloto: number;
  fullName: string;
  category: RaceCategory;
  teamName: string;
  finalPosition: number;
  categoryPosition: number;
  basePoints: number;
  collectiveBonus: number;
  individualBonus: number;
  finalPoints: number;
};

export type RaceComputedResult = {
  entries: RaceResultEntry[];
  generalWinnerPilotId: string | null;
  winningCategory: RaceCategory | null;
  oppositeCategoryFirstPilotId: string | null;
  calculatedAt: string | null;
};

export type StoredResults = {
  race1: RaceComputedResult;
  race2: RaceComputedResult;
};

export type TeamRecord = {
  id: string;
  name: string;
  members: string[];
};

export type IndividualStandingRow = {
  pilotId: string;
  numeroPiloto: number;
  fullName: string;
  pointsRace1: number;
  pointsRace2: number;
  totalPoints: number;
};

export type TeamStandingRow = {
  teamId: string;
  teamName: string;
  totalPoints: number;
  breakdown: Array<{
    pilotId: string;
    numeroPiloto: number;
    fullName: string;
    race1Points: number;
    race2Points: number;
    totalPoints: number;
  }>;
};

export const EMPTY_RACE_RESULT: RaceComputedResult = {
  entries: [],
  generalWinnerPilotId: null,
  winningCategory: null,
  oppositeCategoryFirstPilotId: null,
  calculatedAt: null
};

export function buildRaceRows(grid: RaceGrid) {
  return [
    ...grid.group1.category390.map((pilot) => ({ ...pilot, category: '390cc' as const })),
    ...grid.group1.category270.map((pilot) => ({ ...pilot, category: '270cc' as const })),
    ...grid.group2.category390.map((pilot) => ({ ...pilot, category: '390cc' as const })),
    ...grid.group2.category270.map((pilot) => ({ ...pilot, category: '270cc' as const }))
  ];
}

export function computeRaceResults(
  race: RaceKey,
  rows: Array<{
    pilot: RacePilot & { category: RaceCategory };
    finalPosition: number;
  }>
): RaceComputedResult {
  const ordered = [...rows].sort((a, b) => a.finalPosition - b.finalPosition);
  const generalWinner = ordered[0] ?? null;
  const winningCategory = generalWinner?.pilot.category ?? null;

  const oppositeCategory =
    winningCategory === '390cc' ? '270cc' : winningCategory === '270cc' ? '390cc' : null;

  const firstOpposite =
    oppositeCategory ? ordered.find((row) => row.pilot.category === oppositeCategory) ?? null : null;

  const categoryRanks = new Map<string, number>();

  const entries: RaceResultEntry[] = ordered.map((row) => {
    const categoryRank = (categoryRanks.get(row.pilot.category) ?? 0) + 1;
    categoryRanks.set(row.pilot.category, categoryRank);

    const basePoints = calculateCategoryBasePoints(categoryRank);
    const collectiveBonus = winningCategory && row.pilot.category === winningCategory ? 20 : 0;
    const individualBonus =
      winningCategory &&
      row.pilot.category === winningCategory &&
      firstOpposite &&
      row.finalPosition < firstOpposite.finalPosition
        ? 20
        : 0;

    return {
      race,
      pilotId: row.pilot.pilotId,
      numeroPiloto: row.pilot.numeroPiloto,
      fullName: row.pilot.fullName,
      category: row.pilot.category,
      teamName: row.pilot.teamName,
      finalPosition: row.finalPosition,
      categoryPosition: categoryRank,
      basePoints,
      collectiveBonus,
      individualBonus,
      finalPoints: basePoints + collectiveBonus + individualBonus
    };
  });

  return {
    entries,
    generalWinnerPilotId: generalWinner?.pilot.pilotId ?? null,
    winningCategory,
    oppositeCategoryFirstPilotId: firstOpposite?.pilot.pilotId ?? null,
    calculatedAt: new Date().toISOString()
  };
}

export function buildIndividualStandings(results: StoredResults): IndividualStandingRow[] {
  const race1ByPilot = new Map(results.race1.entries.map((entry) => [entry.pilotId, entry]));
  const race2ByPilot = new Map(results.race2.entries.map((entry) => [entry.pilotId, entry]));

  const pilotIds = new Set<string>([
    ...Array.from(race1ByPilot.keys()),
    ...Array.from(race2ByPilot.keys())
  ]);

  return Array.from(pilotIds)
    .map((pilotId) => {
      const race1 = race1ByPilot.get(pilotId);
      const race2 = race2ByPilot.get(pilotId);

      return {
        pilotId,
        numeroPiloto: race1?.numeroPiloto ?? race2?.numeroPiloto ?? 0,
        fullName: race1?.fullName ?? race2?.fullName ?? 'Piloto sin datos',
        pointsRace1: race1?.finalPoints ?? 0,
        pointsRace2: race2?.finalPoints ?? 0,
        totalPoints: (race1?.finalPoints ?? 0) + (race2?.finalPoints ?? 0)
      };
    })
    .sort((a, b) => {
      const delta = b.totalPoints - a.totalPoints;
      if (delta !== 0) {
        return delta;
      }

      return a.numeroPiloto - b.numeroPiloto;
    });
}

export function buildTeamStandings(results: StoredResults, teams: TeamRecord[]): TeamStandingRow[] {
  const race1ByPilot = new Map(results.race1.entries.map((entry) => [entry.pilotId, entry]));
  const race2ByPilot = new Map(results.race2.entries.map((entry) => [entry.pilotId, entry]));

  return teams
    .map((team) => {
      const breakdown = team.members.map((pilotId) => {
        const race1 = race1ByPilot.get(pilotId);
        const race2 = race2ByPilot.get(pilotId);

        return {
          pilotId,
          numeroPiloto: race1?.numeroPiloto ?? race2?.numeroPiloto ?? 0,
          fullName: race1?.fullName ?? race2?.fullName ?? 'Piloto sin resultado',
          race1Points: race1?.finalPoints ?? 0,
          race2Points: race2?.finalPoints ?? 0,
          totalPoints: (race1?.finalPoints ?? 0) + (race2?.finalPoints ?? 0)
        };
      });

      return {
        teamId: team.id,
        teamName: team.name,
        totalPoints: breakdown.reduce((acc, item) => acc + item.totalPoints, 0),
        breakdown
      };
    })
    .filter((item) => item.breakdown.length > 0)
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

export function normalizeRaceResult(value: unknown): RaceComputedResult {
  if (!value || typeof value !== 'object') {
    return { ...EMPTY_RACE_RESULT };
  }

  const candidate = value as RaceComputedResult;
  const entries = Array.isArray(candidate.entries)
    ? candidate.entries.filter(
        (entry): entry is RaceResultEntry =>
          Boolean(entry) &&
          typeof entry.pilotId === 'string' &&
          typeof entry.finalPosition === 'number' &&
          typeof entry.basePoints === 'number' &&
          typeof entry.collectiveBonus === 'number' &&
          typeof entry.individualBonus === 'number' &&
          typeof entry.finalPoints === 'number'
      )
    : [];

  return {
    entries,
    generalWinnerPilotId: typeof candidate.generalWinnerPilotId === 'string' ? candidate.generalWinnerPilotId : null,
    winningCategory: candidate.winningCategory === '390cc' || candidate.winningCategory === '270cc' ? candidate.winningCategory : null,
    oppositeCategoryFirstPilotId:
      typeof candidate.oppositeCategoryFirstPilotId === 'string' ? candidate.oppositeCategoryFirstPilotId : null,
    calculatedAt: typeof candidate.calculatedAt === 'string' ? candidate.calculatedAt : null
  };
}

export function isRaceGrid(value: unknown): value is RaceGrid {
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

function calculateCategoryBasePoints(categoryPosition: number) {
  return Math.max(40 - (categoryPosition - 1) * 2, 2);
}
