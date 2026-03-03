import { sql } from '@/lib/db';

let resultRelatedTablesReady: Promise<void> | null = null;

async function ensureResultRelatedTables() {
  if (!resultRelatedTablesReady) {
    resultRelatedTablesReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS teams (
          id TEXT PRIMARY KEY,
          event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          name TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS team_members (
          id TEXT PRIMARY KEY,
          team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          pilot_id TEXT NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
          position_in_team INTEGER,
          CONSTRAINT uq_team_members_team_pilot UNIQUE (team_id, pilot_id)
        );
      `;
    })();
  }

  await resultRelatedTablesReady;
}

export type RaceResultDB = {
  id: string;
  event_id: string;
  race_number: number;
  pilot_id: string;
  final_position: number;
  points_base: number;
  bonus_collective: number;
  bonus_individual: number;
  total_points: number;
  created_at: string | Date;
};

export type RaceResultInput = {
  raceNumber: number;
  pilotId: string;
  finalPosition: number;
  pointsBase: number;
  bonusCollective?: number;
  bonusIndividual?: number;
  totalPoints: number;
};

export type RaceResultSnapshotEntry = {
  race: 'race1' | 'race2';
  pilotId: string;
  numeroPiloto: number;
  fullName: string;
  category: '390cc' | '270cc';
  teamName: string;
  finalPosition: number;
  categoryPosition: number;
  basePoints: number;
  collectiveBonus: number;
  individualBonus: number;
  finalPoints: number;
};

const validateResult = (value: RaceResultInput) => {
  if (
    !Number.isFinite(value.raceNumber) ||
    value.raceNumber <= 0 ||
    !value.pilotId ||
    !Number.isFinite(value.finalPosition) ||
    value.finalPosition <= 0 ||
    !Number.isFinite(value.pointsBase) ||
    !Number.isFinite(value.totalPoints)
  ) {
    throw new Error('Datos de resultado inválidos.');
  }
};

export async function getResultsByEvent(eventId: string): Promise<RaceResultDB[]> {
  const { rows } = await sql<RaceResultDB>`
    SELECT *
    FROM race_results
    WHERE event_id = ${eventId}
    ORDER BY race_number ASC, final_position ASC;
  `;
  return rows;
}

export async function getResultsByRace(eventId: string, raceNumber: number): Promise<RaceResultDB[]> {
  const { rows } = await sql<RaceResultDB>`
    SELECT *
    FROM race_results
    WHERE event_id = ${eventId} AND race_number = ${raceNumber}
    ORDER BY final_position ASC;
  `;
  return rows;
}

export async function createResult(eventId: string, data: RaceResultInput): Promise<string> {
  validateResult(data);
  const id = crypto.randomUUID();

  await sql`
    INSERT INTO race_results (
      id,
      event_id,
      race_number,
      pilot_id,
      final_position,
      points_base,
      bonus_collective,
      bonus_individual,
      total_points
    )
    VALUES (
      ${id},
      ${eventId},
      ${Math.floor(data.raceNumber)},
      ${data.pilotId},
      ${Math.floor(data.finalPosition)},
      ${Math.floor(data.pointsBase)},
      ${Math.floor(data.bonusCollective ?? 0)},
      ${Math.floor(data.bonusIndividual ?? 0)},
      ${Math.floor(data.totalPoints)}
    );
  `;

  return id;
}

export async function updateResult(eventId: string, resultId: string, data: RaceResultInput): Promise<void> {
  validateResult(data);

  await sql`
    UPDATE race_results
    SET
      race_number = ${Math.floor(data.raceNumber)},
      pilot_id = ${data.pilotId},
      final_position = ${Math.floor(data.finalPosition)},
      points_base = ${Math.floor(data.pointsBase)},
      bonus_collective = ${Math.floor(data.bonusCollective ?? 0)},
      bonus_individual = ${Math.floor(data.bonusIndividual ?? 0)},
      total_points = ${Math.floor(data.totalPoints)}
    WHERE id = ${resultId} AND event_id = ${eventId};
  `;
}

export async function deleteResult(eventId: string, resultId: string): Promise<void> {
  await sql`DELETE FROM race_results WHERE id = ${resultId} AND event_id = ${eventId};`;
}

export async function getResultsSnapshotEntriesByEvent(eventId: string): Promise<RaceResultSnapshotEntry[]> {
  await ensureResultRelatedTables();

  const { rows } = await sql<{
    race_number: number;
    pilot_id: string;
    numero_piloto: number | null;
    pilot_name: string | null;
    pilot_apellidos: string | null;
    category: '390cc' | '270cc' | null;
    team_name: string | null;
    final_position: number;
    points_base: number;
    bonus_collective: number;
    bonus_individual: number;
    total_points: number;
  }>`
    SELECT
      rr.race_number,
      rr.pilot_id,
      p.number AS numero_piloto,
      p.name AS pilot_name,
      p.apellidos AS pilot_apellidos,
      CASE
        WHEN rp.kart_cc = 390 THEN '390cc'
        WHEN rp.kart_cc = 270 THEN '270cc'
        ELSE '270cc'
      END AS category,
      COALESCE(t.name, 'Sin equipo') AS team_name,
      rr.final_position,
      rr.points_base,
      rr.bonus_collective,
      rr.bonus_individual,
      rr.total_points
    FROM race_results rr
    LEFT JOIN pilots p
      ON p.id = rr.pilot_id
    LEFT JOIN race_parrillas rp
      ON rp.event_id = rr.event_id
      AND rp.race_number = rr.race_number
      AND rp.pilot_id = rr.pilot_id
    LEFT JOIN team_members tm
      ON tm.pilot_id = rr.pilot_id
    LEFT JOIN teams t
      ON t.id = tm.team_id
      AND t.event_id = rr.event_id
    WHERE rr.event_id = ${eventId}
    ORDER BY rr.race_number ASC, rr.final_position ASC, rr.pilot_id ASC;
  `;

  const categoryRankByRace = new Map<string, number>();

  return rows.map((row) => {
    const race: 'race1' | 'race2' = row.race_number === 2 ? 'race2' : 'race1';
    const category = row.category ?? '270cc';
    const rankKey = `${race}:${category}`;
    const nextCategoryRank = (categoryRankByRace.get(rankKey) ?? 0) + 1;
    categoryRankByRace.set(rankKey, nextCategoryRank);

    return {
      race,
      pilotId: row.pilot_id,
      numeroPiloto: row.numero_piloto ?? 0,
      fullName: `${row.pilot_name ?? 'Piloto'}${row.pilot_apellidos ? ` ${row.pilot_apellidos}` : ''}`.trim(),
      category,
      teamName: row.team_name ?? 'Sin equipo',
      finalPosition: row.final_position,
      categoryPosition: nextCategoryRank,
      basePoints: row.points_base,
      collectiveBonus: row.bonus_collective,
      individualBonus: row.bonus_individual,
      finalPoints: row.total_points
    } satisfies RaceResultSnapshotEntry;
  });
}

export async function replaceResultsByEvent(
  eventId: string,
  entries: Array<{
    raceNumber: number;
    pilotId: string;
    finalPosition: number;
    pointsBase: number;
    bonusCollective: number;
    bonusIndividual: number;
    totalPoints: number;
  }>
): Promise<void> {
  await sql`DELETE FROM race_results WHERE event_id = ${eventId};`;

  for (const entry of entries) {
    await createResult(eventId, {
      raceNumber: entry.raceNumber,
      pilotId: entry.pilotId,
      finalPosition: entry.finalPosition,
      pointsBase: entry.pointsBase,
      bonusCollective: entry.bonusCollective,
      bonusIndividual: entry.bonusIndividual,
      totalPoints: entry.totalPoints
    });
  }
}
