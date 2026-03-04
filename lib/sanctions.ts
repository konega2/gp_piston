import type { RaceResultEntry, StoredResults } from '@/lib/resultsEngine';

export type SanctionPhaseType = 'qualy' | 'race';
export type SanctionEffectType = 'add_time_seconds' | 'drop_positions' | 'points_deduction' | 'dsq';

export type SanctionRecord = {
  id: string;
  pilotId: string;
  sourcePhaseType: SanctionPhaseType;
  sourceIndex: number;
  targetPhaseType: SanctionPhaseType;
  targetIndex: number;
  effectType: SanctionEffectType;
  effectValue: number | null;
  reason: string;
  active: boolean;
  createdAt: string;
};

export function normalizeSanctions(value: unknown): SanctionRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Partial<SanctionRecord> => Boolean(item) && typeof item === 'object')
    .map((item) => {
      const sourcePhaseType: SanctionPhaseType = item.sourcePhaseType === 'race' ? 'race' : 'qualy';
      const targetPhaseType: SanctionPhaseType = item.targetPhaseType === 'race' ? 'race' : 'qualy';
      const effectType: SanctionEffectType =
        item.effectType === 'drop_positions' ||
        item.effectType === 'points_deduction' ||
        item.effectType === 'dsq' ||
        item.effectType === 'add_time_seconds'
          ? item.effectType
          : 'drop_positions';

      return {
        id: typeof item.id === 'string' && item.id.length > 0 ? item.id : crypto.randomUUID(),
        pilotId: typeof item.pilotId === 'string' ? item.pilotId : '',
        sourcePhaseType,
        sourceIndex: sanitizePositive(item.sourceIndex, 1),
        targetPhaseType,
        targetIndex: sanitizePositive(item.targetIndex, 1),
        effectType,
        effectValue: typeof item.effectValue === 'number' && Number.isFinite(item.effectValue) ? item.effectValue : null,
        reason: typeof item.reason === 'string' ? item.reason : '',
        active: item.active !== false,
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString()
      } satisfies SanctionRecord;
    })
    .filter((item) => item.pilotId.length > 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function applySanctionsToResults(results: StoredResults, sanctions: SanctionRecord[]): StoredResults {
  const race1 = applyRaceSanctions(results.race1.entries, sanctions, 1);
  const race2 = applyRaceSanctions(results.race2.entries, sanctions, 2);

  return {
    race1: {
      ...results.race1,
      entries: race1,
      generalWinnerPilotId: race1[0]?.pilotId ?? null
    },
    race2: {
      ...results.race2,
      entries: race2,
      generalWinnerPilotId: race2[0]?.pilotId ?? null
    }
  };
}

function applyRaceSanctions(entries: RaceResultEntry[], sanctions: SanctionRecord[], raceNumber: number): RaceResultEntry[] {
  if (entries.length === 0) {
    return entries;
  }

  const applicable = sanctions.filter(
    (sanction) => sanction.active && sanction.targetPhaseType === 'race' && sanction.targetIndex === raceNumber
  );

  if (applicable.length === 0) {
    return [...entries].sort((a, b) => a.finalPosition - b.finalPosition);
  }

  const byPilot = new Map<string, { drop: number; points: number; dsq: boolean }>();

  applicable.forEach((sanction) => {
    const current = byPilot.get(sanction.pilotId) ?? { drop: 0, points: 0, dsq: false };

    if (sanction.effectType === 'drop_positions') {
      current.drop += sanitizePositive(sanction.effectValue, 0);
    } else if (sanction.effectType === 'points_deduction') {
      current.points += sanitizePositive(sanction.effectValue, 0);
    } else if (sanction.effectType === 'dsq') {
      current.dsq = true;
    }

    byPilot.set(sanction.pilotId, current);
  });

  const sorted = [...entries]
    .map((entry) => {
      const sanction = byPilot.get(entry.pilotId) ?? { drop: 0, points: 0, dsq: false };
      return {
        entry,
        desiredRank: sanction.dsq ? Number.MAX_SAFE_INTEGER : entry.finalPosition + sanction.drop,
        pointsPenalty: sanction.points,
        dsq: sanction.dsq
      };
    })
    .sort((a, b) => {
      const rankDelta = a.desiredRank - b.desiredRank;
      if (rankDelta !== 0) {
        return rankDelta;
      }

      const originalDelta = a.entry.finalPosition - b.entry.finalPosition;
      if (originalDelta !== 0) {
        return originalDelta;
      }

      return a.entry.pilotId.localeCompare(b.entry.pilotId);
    });

  const categoryRank = new Map<'390cc' | '270cc', number>();

  return sorted.map((row, index) => {
    const nextCategoryRank = (categoryRank.get(row.entry.category) ?? 0) + 1;
    categoryRank.set(row.entry.category, nextCategoryRank);

    return {
      ...row.entry,
      finalPosition: index + 1,
      categoryPosition: nextCategoryRank,
      finalPoints: row.dsq ? 0 : Math.max(0, row.entry.finalPoints - row.pointsPenalty)
    };
  });
}

function sanitizePositive(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return fallback;
  }

  return Math.floor(value);
}
