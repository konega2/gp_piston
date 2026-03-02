import { redirect } from 'next/navigation';

import { createPilotSession } from '@/lib/pilot-auth';
import { sql } from '@/lib/db';
import LoginForm from './LoginForm';

type Props = {
  params: { slug: string };
  searchParams?: { error?: string };
};

type EventRow = { id: string; name: string; status: string };
type PilotRow = { id: string };

const ERROR_MAP: Record<string, string> = {
  invalid: 'Invalid driver code — check and try again',
  empty: 'Driver code is required',
};

export default async function PublicLoginPage({ params, searchParams }: Props) {
  const slug = params.slug;

  const { rows } = await sql<EventRow>`
    SELECT id, name, status
    FROM events
    WHERE slug = ${slug}
      AND status = 'active'
    LIMIT 1
  `;

  const event = rows[0] ?? null;

  if (!event) {
    return (
      <div className="py-8 text-center space-y-5">
        <p className="text-[8px] uppercase tracking-[0.45em] text-[#E10600]/60">GP PISTÓN · DIGITAL RACE CONTROL</p>
        <div className="inline-flex items-center gap-2 border border-[#1A2230] px-4 py-2 text-[9px] uppercase tracking-[0.35em] text-[#2D3E52]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2D3E52]" />
          NO ACTIVE CHAMPIONSHIP
        </div>
        <p className="text-[11px] text-[#1A2230] font-mono">
          /{slug}
        </p>
      </div>
    );
  }

  const errorMessage = searchParams?.error
    ? (ERROR_MAP[searchParams.error] ?? 'Código inválido')
    : null;

  async function loginAction(formData: FormData) {
    'use server';

    const rawCode = formData.get('login_code');
    const loginCode = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';
    const remember = formData.get('remember') === 'on';

    if (!loginCode) {
      redirect(`/${slug}/login?error=empty`);
    }

    const { rows: pilotRows } = await sql<PilotRow>`
      SELECT id
      FROM pilots
      WHERE event_id = ${event.id}
        AND LOWER(login_code) = LOWER(${loginCode})
      LIMIT 1
    `;

    if (!pilotRows[0]) {
      redirect(`/${slug}/login?error=invalid`);
    }

    await createPilotSession(event.id, pilotRows[0].id, remember);
    redirect(`/${slug}/dashboard`);
  }

  return (
    <LoginForm
      action={loginAction}
      errorMessage={errorMessage}
      eventName={event.name}
    />
  );
}
