import { sql } from '@/lib/db';

export type PilotDBRecord = {
  id: string;
  event_id: string;
  login_code: string | null;
  avatar_url?: string | null;
  number: number;
  name: string;
  apellidos: string | null;
  edad: number | null;
  telefono: string | null;
  redes_sociales: string | null;
  peso: number | null;
  nivel: 'PRO' | 'AMATEUR' | 'PRINCIPIANTE' | null;
  has_time_attack: boolean;
  created_at: string | Date;
};

export type PilotInput = {
  number: number;
  loginCode?: string;
  avatarUrl?: string;
  name: string;
  apellidos?: string;
  edad?: number;
  telefono?: string;
  redesSociales?: string;
  peso?: number;
  nivel?: 'PRO' | 'AMATEUR' | 'PRINCIPIANTE';
  hasTimeAttack?: boolean;
};

const validatePilotInput = (data: PilotInput) => {
  if (!data.name?.trim() || !Number.isFinite(data.number) || data.number <= 0) {
    throw new Error('Datos de piloto inválidos.');
  }
};

export async function getPilotsByEvent(eventId: string): Promise<PilotDBRecord[]> {
  const { rows } = await sql<PilotDBRecord>`
    SELECT *
    FROM pilots
    WHERE event_id = ${eventId}
    ORDER BY number ASC, created_at DESC;
  `;

  return rows;
}

export async function createPilot(eventId: string, data: PilotInput): Promise<string> {
  validatePilotInput(data);
  const id = crypto.randomUUID();
  const loginCode =
    typeof data.loginCode === 'string' && data.loginCode.trim().length > 0
      ? data.loginCode.trim().toUpperCase()
      : buildPilotLoginCode(data.number);

  await sql`
    INSERT INTO pilots (id, event_id, login_code, number, name, apellidos, edad, telefono, redes_sociales, peso, nivel, has_time_attack)
    VALUES (
      ${id},
      ${eventId},
      ${loginCode},
      ${Math.floor(data.number)},
      ${data.name.trim()},
      ${data.apellidos?.trim() ?? null},
      ${typeof data.edad === 'number' ? Math.floor(data.edad) : null},
      ${data.telefono?.trim() ?? null},
      ${data.redesSociales?.trim() ?? null},
      ${typeof data.peso === 'number' ? data.peso : null},
      ${data.nivel ?? null},
      ${Boolean(data.hasTimeAttack)}
    );
  `;

  return id;
}

export async function updatePilot(eventId: string, pilotId: string, data: PilotInput): Promise<void> {
  validatePilotInput(data);

  await sql`
    UPDATE pilots
    SET
      number = ${Math.floor(data.number)},
      login_code = COALESCE(${data.loginCode?.trim()?.toUpperCase() ?? null}, login_code),
      name = ${data.name.trim()},
      apellidos = ${data.apellidos?.trim() ?? null},
      edad = ${typeof data.edad === 'number' ? Math.floor(data.edad) : null},
      telefono = ${data.telefono?.trim() ?? null},
      redes_sociales = ${data.redesSociales?.trim() ?? null},
      peso = ${typeof data.peso === 'number' ? data.peso : null},
      nivel = ${data.nivel ?? null},
      has_time_attack = ${Boolean(data.hasTimeAttack)}
    WHERE id = ${pilotId} AND event_id = ${eventId};
  `;
}

function buildPilotLoginCode(pilotNumber: number) {
  const safeNumber = Math.max(1, Math.floor(pilotNumber));
  const random = Math.floor(Math.random() * 10000);
  return `GP-${String(safeNumber).padStart(3, '0')}-${String(random).padStart(4, '0')}`;
}

export async function deletePilot(eventId: string, pilotId: string): Promise<void> {
  await sql`
    DELETE FROM pilots
    WHERE id = ${pilotId} AND event_id = ${eventId};
  `;
}
