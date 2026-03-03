import { sql } from '@/lib/db';

export type TeamDBRecord = {
  id: string;
  event_id: string;
  name: string | null;
  created_at: string | Date;
};

export type TeamMemberDBRecord = {
  id: string;
  team_id: string;
  pilot_id: string;
  position_in_team: number | null;
};

export type TeamSnapshot = {
  id: string;
  name: string;
  members: string[];
};

let teamsTablesReady: Promise<void> | null = null;

async function ensureTeamsTables() {
  if (!teamsTablesReady) {
    teamsTablesReady = (async () => {
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

      await sql`CREATE INDEX IF NOT EXISTS idx_teams_event_id ON teams(event_id);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_team_members_team_pilot ON team_members(team_id, pilot_id);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_team_members_pilot_id ON team_members(pilot_id);`;
    })();
  }

  await teamsTablesReady;
}

export async function getTeamsByEvent(eventId: string): Promise<TeamSnapshot[]> {
  await ensureTeamsTables();

  const { rows } = await sql<{
    team_id: string;
    team_name: string | null;
    pilot_id: string | null;
    position_in_team: number | null;
  }>`
    SELECT t.id AS team_id, t.name AS team_name, tm.pilot_id, tm.position_in_team
    FROM teams t
    LEFT JOIN team_members tm ON tm.team_id = t.id
    WHERE t.event_id = ${eventId}
    ORDER BY t.created_at ASC, t.id ASC, tm.position_in_team ASC NULLS LAST, tm.pilot_id ASC NULLS LAST;
  `;

  const byTeam = new Map<string, TeamSnapshot>();

  rows.forEach((row) => {
    if (!byTeam.has(row.team_id)) {
      byTeam.set(row.team_id, {
        id: row.team_id,
        name: row.team_name ?? 'Equipo sin nombre',
        members: []
      });
    }

    if (typeof row.pilot_id === 'string' && row.pilot_id.length > 0) {
      const team = byTeam.get(row.team_id);
      if (!team) {
        return;
      }

      if (!team.members.includes(row.pilot_id)) {
        team.members.push(row.pilot_id);
      }
    }
  });

  return Array.from(byTeam.values());
}

export async function replaceTeamsByEvent(eventId: string, teams: TeamSnapshot[]): Promise<void> {
  await ensureTeamsTables();

  await sql`
    DELETE FROM team_members
    WHERE team_id IN (SELECT id FROM teams WHERE event_id = ${eventId});
  `;

  await sql`DELETE FROM teams WHERE event_id = ${eventId};`;

  for (const team of teams) {
    if (!team?.id || typeof team.id !== 'string') {
      continue;
    }

    await sql`
      INSERT INTO teams (id, event_id, name)
      VALUES (${team.id}, ${eventId}, ${team.name ?? null});
    `;

    const seen = new Set<string>();
    team.members.forEach((pilotId) => {
      if (typeof pilotId !== 'string' || pilotId.length === 0 || seen.has(pilotId)) {
        return;
      }

      seen.add(pilotId);
    });

    for (const [index, pilotId] of Array.from(seen).entries()) {
      await sql`
        INSERT INTO team_members (id, team_id, pilot_id, position_in_team)
        VALUES (${crypto.randomUUID()}, ${team.id}, ${pilotId}, ${index + 1});
      `;
    }
  }
}
