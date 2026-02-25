import { sql } from '@/lib/db';

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
