export type CombinedTimeSource = 'TA' | 'QUALY' | 'MEJOR ENTRE AMBOS';

export type RankingPilot = {
  id: string;
  numeroPiloto: number;
  nombre: string;
  apellidos: string;
  hasTimeAttack?: boolean;
};

export type RankingSession = {
  id: string;
  times: Array<{
    pilotId: string;
    correctedTime: number;
  }>;
};

export type QualyRecord = {
  pilotId: string;
  qualyTime: number | null;
};

export type CombinedStandingRow = {
  pilotId: string;
  numeroPiloto: number;
  fullName: string;
  finalTime: number;
  source: CombinedTimeSource;
  fromTimeAttack: boolean;
};

export type TimeAttackRankingRow = {
  pilotId: string;
  numeroPiloto: number;
  fullName: string;
  bestCorrectedTime: number;
  sessionsDisputed: number;
};

export function buildCombinedStandings({
  pilots,
  sessions,
  qualyRecords
}: {
  pilots: RankingPilot[];
  sessions: RankingSession[];
  qualyRecords: QualyRecord[];
}) {
  const bestTimeAttackByPilot = new Map<string, number>();

  sessions.forEach((session) => {
    session.times.forEach((time) => {
      if (!Number.isFinite(time.correctedTime) || time.correctedTime <= 0) {
        return;
      }

      const current = bestTimeAttackByPilot.get(time.pilotId);
      if (typeof current !== 'number' || time.correctedTime < current) {
        bestTimeAttackByPilot.set(time.pilotId, time.correctedTime);
      }
    });
  });

  const qualyByPilot = new Map<string, number>();
  qualyRecords.forEach((record) => {
    if (!Number.isFinite(record.qualyTime) || (record.qualyTime ?? 0) <= 0) {
      return;
    }

    const current = qualyByPilot.get(record.pilotId);
    const next = record.qualyTime as number;
    if (typeof current !== 'number' || next < current) {
      qualyByPilot.set(record.pilotId, next);
    }
  });

  return pilots
    .map((pilot) => {
      const timeAttack = bestTimeAttackByPilot.get(pilot.id);
      const qualy = qualyByPilot.get(pilot.id);

      if (typeof timeAttack !== 'number' && typeof qualy !== 'number') {
        return null;
      }

      let finalTime: number;
      let source: CombinedTimeSource;
      let fromTimeAttack = false;

      if (typeof timeAttack === 'number' && typeof qualy === 'number') {
        finalTime = Math.min(timeAttack, qualy);
        source = 'MEJOR ENTRE AMBOS';
        fromTimeAttack = timeAttack <= qualy;
      } else if (typeof timeAttack === 'number') {
        finalTime = timeAttack;
        source = 'TA';
        fromTimeAttack = true;
      } else {
        finalTime = qualy as number;
        source = 'QUALY';
      }

      return {
        pilotId: pilot.id,
        numeroPiloto: pilot.numeroPiloto,
        fullName: `${pilot.nombre} ${pilot.apellidos}`,
        finalTime,
        source,
        fromTimeAttack
      } satisfies CombinedStandingRow;
    })
    .filter((row): row is CombinedStandingRow => Boolean(row))
    .sort((a, b) => {
      const timeDelta = a.finalTime - b.finalTime;
      if (timeDelta !== 0) {
        return timeDelta;
      }

      return a.numeroPiloto - b.numeroPiloto;
    });
}

export function buildTimeAttackRanking({
  pilots,
  sessions
}: {
  pilots: RankingPilot[];
  sessions: RankingSession[];
}): TimeAttackRankingRow[] {
  const eligiblePilots = pilots.filter((pilot) => pilot.hasTimeAttack);

  return eligiblePilots
    .map((pilot) => {
      const validTimesBySession = sessions
        .map((session) => {
          const pilotTimes = session.times
            .filter((time) => time.pilotId === pilot.id && Number.isFinite(time.correctedTime) && time.correctedTime > 0)
            .map((time) => time.correctedTime);

          if (pilotTimes.length === 0) {
            return null;
          }

          const correctedTime = Math.min(...pilotTimes);

          return {
            sessionId: session.id,
            correctedTime
          };
        })
        .filter((value): value is { sessionId: string; correctedTime: number } => Boolean(value));

      if (validTimesBySession.length === 0) {
        return null;
      }

      const bestCorrectedTime = Math.min(...validTimesBySession.map((item) => item.correctedTime));
      const sessionsDisputed = new Set(validTimesBySession.map((item) => item.sessionId)).size;

      return {
        pilotId: pilot.id,
        numeroPiloto: pilot.numeroPiloto,
        fullName: `${pilot.nombre} ${pilot.apellidos}`,
        bestCorrectedTime,
        sessionsDisputed
      };
    })
    .filter((row): row is TimeAttackRankingRow => Boolean(row))
    .sort((a, b) => {
      const timeDelta = a.bestCorrectedTime - b.bestCorrectedTime;
      if (timeDelta !== 0) {
        return timeDelta;
      }

      const sessionsDelta = b.sessionsDisputed - a.sessionsDisputed;
      if (sessionsDelta !== 0) {
        return sessionsDelta;
      }

      return a.numeroPiloto - b.numeroPiloto;
    });
}
