import { cookies } from 'next/headers';

export type PilotSession = {
  eventId: string;
  pilotId: string;
};

const PILOT_SESSION_COOKIE = 'pilot_session';
const REMEMBER_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function createPilotSession(eventId: string, pilotId: string, remember = false) {
  const cookieStore = cookies();

  cookieStore.set(PILOT_SESSION_COOKIE, JSON.stringify({ eventId, pilotId }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(remember ? { maxAge: REMEMBER_MAX_AGE_SECONDS } : {})
  });
}

export async function getPilotSession(): Promise<PilotSession | null> {
  const cookieStore = cookies();
  const raw = cookieStore.get(PILOT_SESSION_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PilotSession>;

    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.eventId === 'string' &&
      parsed.eventId.length > 0 &&
      typeof parsed.pilotId === 'string' &&
      parsed.pilotId.length > 0
    ) {
      return {
        eventId: parsed.eventId,
        pilotId: parsed.pilotId
      };
    }

    return null;
  } catch {
    return null;
  }
}

export async function clearPilotSession() {
  const cookieStore = cookies();

  cookieStore.set(PILOT_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0)
  });
}
