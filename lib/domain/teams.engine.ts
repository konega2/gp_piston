export type TeamGenerationPilot = {
  id: string;
  numeroPiloto: number;
  nivel: 'PRO' | 'AMATEUR' | 'PRINCIPIANTE';
  kart: '390cc' | '270cc';
};

export type TeamRecord = {
  id: string;
  name: string;
  members: string[];
};

export type AutoAssignStrategy = 'normativa' | 'levels' | 'times' | 'karts';

export function createTeamPlaceholders(count: number): TeamRecord[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `team-${index + 1}`,
    name: `Equipo ${index + 1}`,
    members: [] as string[]
  }));
}

export function buildTeamsByNormativa(orderedPilots: TeamGenerationPilot[], teamsCount: number): TeamRecord[] {
  const safeTeamsCount = sanitizeTeamsCount(teamsCount, orderedPilots.length);
  const teams: TeamRecord[] = createTeamPlaceholders(safeTeamsCount).map((team): TeamRecord => ({
    ...team,
    members: []
  }));

  const total = orderedPilots.length;
  const groupSize = Math.ceil(total / 2);
  const group1 = orderedPilots.slice(0, groupSize);
  const group2 = orderedPilots.slice(groupSize);
  const group1Size = group1.length;
  const group2Size = group2.length;
  const patternTeams = Math.min(safeTeamsCount, Math.max(Math.floor(groupSize / 2), 1));

  for (let index = 0; index < patternTeams; index += 1) {
    const frontStart = index * 2;
    const backStart1 = group1Size - 1 - index * 2;
    const backStart2 = group2Size - 1 - index * 2;
    const positionsGroup1 = [frontStart, frontStart + 1, backStart1 - 1, backStart1];
    const positionsGroup2 = [frontStart, frontStart + 1, backStart2 - 1, backStart2];
    const team = teams[index];

    positionsGroup1.forEach((position) => {
      const pilot = group1[position];
      if (pilot && !team.members.includes(pilot.id)) {
        team.members.push(pilot.id);
      }
    });

    positionsGroup2.forEach((position) => {
      const pilot = group2[position];
      if (pilot && !team.members.includes(pilot.id)) {
        team.members.push(pilot.id);
      }
    });
  }

  const used = new Set(teams.flatMap((team) => team.members));
  const remaining = orderedPilots.filter((pilot) => !used.has(pilot.id));

  remaining.forEach((pilot, index) => {
    const team = teams[index % teams.length];
    if (team && !team.members.includes(pilot.id)) {
      team.members.push(pilot.id);
    }
  });

  return teams;
}

export function buildTeamsByTimes(orderedPilots: TeamGenerationPilot[], teamsCount: number): TeamRecord[] {
  return buildTeamsBySnakeDraft(orderedPilots, teamsCount);
}

export function buildTeamsByLevels(pilots: TeamGenerationPilot[], teamsCount: number): TeamRecord[] {
  const byLevel = [...pilots].sort((a, b) => {
    const priority: Record<TeamGenerationPilot['nivel'], number> = {
      PRO: 0,
      AMATEUR: 1,
      PRINCIPIANTE: 2
    };

    const diff = priority[a.nivel] - priority[b.nivel];
    if (diff !== 0) {
      return diff;
    }

    return a.numeroPiloto - b.numeroPiloto;
  });

  return buildTeamsBySnakeDraft(byLevel, teamsCount);
}

export function buildTeamsByKarts(pilots: TeamGenerationPilot[], teamsCount: number): TeamRecord[] {
  const k390 = pilots.filter((pilot) => pilot.kart === '390cc').sort((a, b) => a.numeroPiloto - b.numeroPiloto);
  const k270 = pilots.filter((pilot) => pilot.kart === '270cc').sort((a, b) => a.numeroPiloto - b.numeroPiloto);

  return buildTeamsBySnakeDraft(interleaveLists(k390, k270), teamsCount);
}

export function buildTeamsBySnakeDraft(orderedPilots: TeamGenerationPilot[], teamsCount: number): TeamRecord[] {
  const safeTeamsCount = sanitizeTeamsCount(teamsCount, orderedPilots.length);
  const teams = createTeamPlaceholders(safeTeamsCount);
  if (teams.length === 0) {
    return [];
  }

  let cursor = 0;
  let direction: 1 | -1 = 1;

  orderedPilots.forEach((pilot) => {
    const team = teams[cursor];
    if (team && !team.members.includes(pilot.id)) {
      team.members.push(pilot.id);
    }

    if (direction === 1 && cursor === teams.length - 1) {
      direction = -1;
    } else if (direction === -1 && cursor === 0) {
      direction = 1;
    } else {
      cursor += direction;
    }
  });

  return teams;
}

export function resizeTeamsKeepingMembers(existingTeams: TeamRecord[], teamsCount: number): TeamRecord[] {
  const safeTeamsCount = sanitizeTeamsCount(teamsCount, existingTeams.reduce((acc, team) => acc + team.members.length, 0));
  const placeholders = createTeamPlaceholders(safeTeamsCount);
  const flattenedMembers = existingTeams.flatMap((team) => team.members);

  flattenedMembers.forEach((pilotId, index) => {
    const team = placeholders[index % placeholders.length];
    if (team && !team.members.includes(pilotId)) {
      team.members.push(pilotId);
    }
  });

  return placeholders;
}

export function sanitizeTeamsCount(value: number, pilotsCount: number) {
  const max = Math.max(pilotsCount, 1);
  if (!Number.isFinite(value) || value <= 0) {
    return Math.min(2, max);
  }

  return Math.min(Math.floor(value), max);
}

export function labelForStrategy(strategy: AutoAssignStrategy) {
  if (strategy === 'normativa') {
    return 'normativa';
  }

  if (strategy === 'levels') {
    return 'niveles';
  }

  if (strategy === 'karts') {
    return 'karts';
  }

  return 'tiempos';
}

function interleaveLists(first: TeamGenerationPilot[], second: TeamGenerationPilot[]) {
  const merged: TeamGenerationPilot[] = [];
  const max = Math.max(first.length, second.length);

  for (let index = 0; index < max; index += 1) {
    const itemFirst = first[index];
    const itemSecond = second[index];
    if (itemFirst) {
      merged.push(itemFirst);
    }
    if (itemSecond) {
      merged.push(itemSecond);
    }
  }

  return merged;
}
