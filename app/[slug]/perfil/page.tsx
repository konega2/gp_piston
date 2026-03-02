import { redirect } from 'next/navigation';

import { clearPilotSession, getPilotSession } from '@/lib/pilot-auth';
import { sql } from '@/lib/db';

type PerfilPageProps = {
  params: {
    slug: string;
  };
};

type EventLookupRow = {
  id: string;
};

type PilotProfileRow = {
  id: string;
  number: number;
  name: string;
  apellidos: string | null;
  nivel: string | null;
};

type PilotKartRow = {
  kart_cc: number | null;
};

export default async function PublicPilotProfilePage({ params }: PerfilPageProps) {
  const slug = params.slug;
  const session = await getPilotSession();

  if (!session) {
    redirect(`/${slug}/login`);
  }

  const { rows: eventRows } = await sql<EventLookupRow>`
    SELECT id
    FROM events
    WHERE slug = ${slug}
    LIMIT 1;
  `;

  const event = eventRows[0] ?? null;

  if (!event) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-xs uppercase tracking-[0.28em] text-[#9CA3AF]">404</p>
        <h1 className="text-xl font-bold uppercase tracking-[0.16em] text-[#FFFFFF]">EVENTO NO ENCONTRADO</h1>
        <p className="text-sm text-[#9CA3AF]">No existe una competición pública para este identificador.</p>
      </div>
    );
  }

  if (session.eventId !== event.id) {
    redirect(`/${slug}/login`);
  }

  const { rows: pilotRows } = await sql<PilotProfileRow>`
    SELECT id, number, name, apellidos, nivel
    FROM pilots
    WHERE id = ${session.pilotId}
      AND event_id = ${event.id}
    LIMIT 1;
  `;

  const pilot = pilotRows[0] ?? null;

  if (!pilot) {
    redirect(`/${slug}/login`);
  }

  const { rows: kartRows } = await sql<PilotKartRow>`
    SELECT kart_cc
    FROM race_parrillas
    WHERE event_id = ${event.id}
      AND pilot_id = ${pilot.id}
    ORDER BY created_at DESC
    LIMIT 1;
  `;

  const kart = kartRows[0]?.kart_cc ? `KART ${kartRows[0].kart_cc}` : 'SIN ASIGNAR';
  const fullName = `${pilot.name}${pilot.apellidos ? ` ${pilot.apellidos}` : ''}`.trim();
  const level = pilot.nivel ?? 'NO DEFINIDO';

  async function logoutAction() {
    'use server';

    await clearPilotSession();
    redirect(`/${slug}/login`);
  }

  return (
    <div>
      <h1 className="text-center text-xl font-extrabold uppercase tracking-[0.16em] text-[#FFFFFF]">PERFIL DE PILOTO</h1>
      <p className="mt-2 text-center text-xs uppercase tracking-[0.22em] text-[#9CA3AF]">BIENVENIDO AL SISTEMA OFICIAL</p>

      <div className="mt-6 space-y-3 rounded-lg border border-[#374151] bg-[#0B0F14] p-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#9CA3AF]">Nombre completo</p>
          <p className="mt-1 text-base font-semibold text-[#FFFFFF]">{fullName}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#9CA3AF]">Número</p>
            <p className="mt-1 text-base font-semibold text-[#FFFFFF]">#{pilot.number}</p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#9CA3AF]">Nivel</p>
            <p className="mt-1 text-base font-semibold text-[#FFFFFF]">{level}</p>
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#9CA3AF]">Kart</p>
          <p className="mt-1 text-base font-semibold text-[#FFFFFF]">{kart}</p>
        </div>
      </div>

      <form action={logoutAction} className="mt-6">
        <button
          type="submit"
          className="w-full rounded-lg border border-[#374151] bg-[#111827] px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] text-[#FFFFFF] transition hover:border-[#E10600] hover:text-[#FFFFFF]"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
