import type { PilotRecord } from '@/data/pilots';
import type { TimeAttackSession } from '@/data/timeAttackSessions';
import type { QualyRecord } from '@/context/ClassificationContext';
import {
  buildCombinedStandings as buildCombinedStandingsEngine,
  type CombinedTimeSource,
  type CombinedStandingRow
} from '@/lib/domain/ranking.engine';

export type { CombinedTimeSource, CombinedStandingRow };

export function buildCombinedStandings({
  pilots,
  sessions,
  qualyRecords
}: {
  pilots: PilotRecord[];
  sessions: TimeAttackSession[];
  qualyRecords: QualyRecord[];
}) {
  return buildCombinedStandingsEngine({ pilots, sessions, qualyRecords });
}
