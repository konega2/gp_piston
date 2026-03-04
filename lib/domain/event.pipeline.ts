import { getEventModulePayload } from '@/lib/eventState';
import { getPilotsByEvent } from '@/lib/pilots';
import { getTeamsByEvent } from '@/lib/teams';
import { getResultsSnapshotEntriesByEvent } from '@/lib/results';
import { getOrCreateEventDomainSeed } from '@/lib/events';
import { buildCombinedStandings, buildTimeAttackRanking, type CombinedStandingRow } from '@/lib/domain/ranking.engine';
import {
  buildIndividualStandings,
  buildTeamStandings,
  type StoredResults,
  type TeamRecord,
  type RaceComputedResult
} from '@/lib/domain/scoring.engine';

type ModuleTimeAttackSession = {
  id?: string;
  times?: Array<{
    pilotId?: string;
    correctedTime?: number;
  }>;
};

type ModuleQualySession = {
  groupName?: string;
  assignedPilots?: string[];
  times?: Array<{
    pilotId?: string;
    qualyTime?: number | null;
  }>;
};

type SnapshotRow = {
  race: 'race1' | 'race2';
  pilotId: string;
  numeroPiloto: number;
  fullName: string;
  category: '390cc' | '270cc';
  teamName: string;
  finalPosition: number;
  fastestLapSeconds: number | null;
  categoryPosition: number;
  basePoints: number;
  collectiveBonus: number;
  individualBonus: number;
  finalPoints: number;
};

function normalizeRaceResult(entries: SnapshotRow[], race: 'race1' | 'race2'): RaceComputedResult {
  const ordered = [...entries].sort((a, b) => {
    const positionDelta = a.finalPosition - b.finalPosition;
    if (positionDelta !== 0) {
      return positionDelta;
    }

    const numberDelta = a.numeroPiloto - b.numeroPiloto;
    if (numberDelta !== 0) {
      return numberDelta;
    }

    return a.pilotId.localeCompare(b.pilotId);
  });
  const winner = ordered[0] ?? null;
  const winningCategory = winner?.category ?? null;
  const oppositeCategory = winningCategory === '390cc' ? '270cc' : winningCategory === '270cc' ? '390cc' : null;
  const oppositeLeader = oppositeCategory ? ordered.find((entry) => entry.category === oppositeCategory) ?? null : null;

  return {
    entries: ordered.map((entry) => ({
      race,
      pilotId: entry.pilotId,
      numeroPiloto: entry.numeroPiloto,
      fullName: entry.fullName,
      category: entry.category,
      teamName: entry.teamName,
      finalPosition: entry.finalPosition,
      fastestLapSeconds: entry.fastestLapSeconds,
      categoryPosition: entry.categoryPosition,
      basePoints: entry.basePoints,
      collectiveBonus: entry.collectiveBonus,
      individualBonus: entry.individualBonus,
      finalPoints: entry.finalPoints
    })),
    generalWinnerPilotId: winner?.pilotId ?? null,
    winningCategory,
    oppositeCategoryFirstPilotId: oppositeLeader?.pilotId ?? null,
    calculatedAt: null
  };
}

function normalizeStoredResults(rows: SnapshotRow[]): StoredResults {
  const race1 = rows.filter((row) => row.race === 'race1');
  const race2 = rows.filter((row) => row.race === 'race2');

  return {
    race1: normalizeRaceResult(race1, 'race1'),
    race2: normalizeRaceResult(race2, 'race2')
  };
}

function toKart(nivel: 'PRO' | 'AMATEUR' | 'PRINCIPIANTE' | null): '390cc' | '270cc' {
  return nivel === 'PRO' ? '390cc' : '270cc';
}

function normalizeQualyRecords(payload: unknown) {
  if (!Array.isArray(payload)) {
    return [];
  }

  const sessions = payload as ModuleQualySession[];

  return sessions.flatMap((session) => {
    const assignedPilots = Array.isArray(session.assignedPilots) ? session.assignedPilots : [];
    const times = Array.isArray(session.times) ? session.times : [];

    return [...assignedPilots].sort((a, b) => a.localeCompare(b)).map((pilotId) => {
      const found = times.find((time) => time?.pilotId === pilotId);
      return {
        pilotId,
        qualyTime: typeof found?.qualyTime === 'number' ? found.qualyTime : null
      };
    });
  }).sort((a, b) => a.pilotId.localeCompare(b.pilotId));
}

function normalizeTimeAttackSessions(payload: unknown) {
  if (!Array.isArray(payload)) {
    return [];
  }

  const sessions = payload as ModuleTimeAttackSession[];
  return sessions
    .map((session, index) => ({
    id: typeof session.id === 'string' ? session.id : `session-${index + 1}`,
    times: Array.isArray(session.times)
      ? session.times
          .filter(
            (time): time is { pilotId: string; correctedTime: number } =>
              typeof time?.pilotId === 'string' && typeof time?.correctedTime === 'number'
          )
          .map((time) => ({
            pilotId: time.pilotId,
            correctedTime: time.correctedTime
          }))
          .sort((a, b) => {
            const pilotDelta = a.pilotId.localeCompare(b.pilotId);
            if (pilotDelta !== 0) {
              return pilotDelta;
            }

            return a.correctedTime - b.correctedTime;
          })
      : []
  }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function computeFullEvent(eventId: string) {
  const [domainSeed, pilotRows, teamsSnapshot, timeAttackPayload, qualyPayload, racesPayload, resultRows] = await Promise.all([
    getOrCreateEventDomainSeed(eventId),
    getPilotsByEvent(eventId),
    getTeamsByEvent(eventId),
    getEventModulePayload(eventId, 'timeAttack'),
    getEventModulePayload(eventId, 'qualy'),
    getEventModulePayload(eventId, 'races'),
    getResultsSnapshotEntriesByEvent(eventId)
  ]);

  const pilots = pilotRows
    .map((pilot) => ({
      id: pilot.id,
      numeroPiloto: pilot.number,
      nombre: pilot.name,
      apellidos: pilot.apellidos ?? '',
      hasTimeAttack: pilot.has_time_attack,
      nivel: pilot.nivel ?? 'PRINCIPIANTE',
      kart: toKart(pilot.nivel)
    }))
    .sort((a, b) => {
      const numberDelta = a.numeroPiloto - b.numeroPiloto;
      if (numberDelta !== 0) {
        return numberDelta;
      }

      return a.id.localeCompare(b.id);
    });

  const sessions = normalizeTimeAttackSessions(timeAttackPayload);
  const qualyRecords = normalizeQualyRecords(qualyPayload);

  const combinedStandings = buildCombinedStandings({ pilots, sessions, qualyRecords });
  const timeAttackRanking = buildTimeAttackRanking({ pilots, sessions });

  const storedResults = normalizeStoredResults(resultRows);

  const teams: TeamRecord[] = teamsSnapshot
    .map((team) => ({
      id: team.id,
      name: team.name,
      members: [...team.members].sort((a, b) => a.localeCompare(b))
    }))
    .sort((a, b) => {
      const nameDelta = a.name.localeCompare(b.name);
      if (nameDelta !== 0) {
        return nameDelta;
      }

      return a.id.localeCompare(b.id);
    });

  const individualStandings = buildIndividualStandings(storedResults);
  const teamStandings = buildTeamStandings(storedResults, teams);

  return {
    eventId,
    seed: domainSeed,
    sources: {
      pilots: pilots.length,
      sessions: sessions.length,
      qualyRecords: qualyRecords.length,
      teams: teams.length,
      results: storedResults.race1.entries.length + storedResults.race2.entries.length
    },
    standings: {
      combined: combinedStandings as CombinedStandingRow[],
      timeAttack: timeAttackRanking,
      individual: individualStandings,
      teams: teamStandings
    },
    snapshots: {
      races: racesPayload,
      results: storedResults
    }
  };
}
