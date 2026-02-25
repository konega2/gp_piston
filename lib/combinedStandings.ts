import type { PilotRecord } from '@/data/pilots';
import type { TimeAttackSession } from '@/data/timeAttackSessions';
import type { QualyRecord } from '@/context/ClassificationContext';

export type CombinedTimeSource = 'TA' | 'QUALY' | 'MEJOR ENTRE AMBOS';

export type CombinedStandingRow = {
  pilotId: string;
  numeroPiloto: number;
  fullName: string;
  finalTime: number;
  source: CombinedTimeSource;
  fromTimeAttack: boolean;
};

export function buildCombinedStandings({
  pilots,
  sessions,
  qualyRecords
}: {
  pilots: PilotRecord[];
  sessions: TimeAttackSession[];
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

    qualyByPilot.set(record.pilotId, record.qualyTime as number);
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
