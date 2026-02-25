'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { SessionCard } from '@/components/timeattack/SessionCard';
import { useTimeAttackSessions } from '@/context/TimeAttackContext';
import { useEventName } from '@/lib/event-client';

export default function TimeAttackSessionsPage() {
  const { activeEventId, isHydrated: activeEventHydrated } = useActiveEvent();
  const eventNameFromDb = useEventName(activeEventId);
  const { sessions, closeSession, isHydrated } = useTimeAttackSessions();
  const eventName = activeEventHydrated ? eventNameFromDb ?? 'Evento' : 'Evento';
  const firstSession = sessions[0]?.name ?? 'T1';
  const lastSession = sessions[sessions.length - 1]?.name ?? 'T1';
  const maxCapacity = sessions[0]?.maxCapacity ?? 0;

  return (
    <main className="min-h-screen bg-gp-bg text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar activeItem="time-attack" />

        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(0,207,255,0.09),transparent_42%),radial-gradient(circle_at_85%_18%,rgba(225,6,0,0.08),transparent_40%),linear-gradient(to_bottom,#0A0F16,#0A0F16)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-size:11px_11px] [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />

          <div className="relative z-10">
            <Header title="TIME ATTACK" subtitle="Gestión de entrenamientos y tiempos oficiales" />

            <section className="px-5 py-6 sm:px-6">
              <div className="mx-auto max-w-7xl space-y-5">
                <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                  <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">{eventName.toUpperCase()} · CONFIGURACIÓN CERRADA</p>
                  <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.14em] text-white">Sesiones Oficiales {firstSession} — {lastSession}</h1>
                  <p className="mt-2 text-sm text-gp-textSoft">Las sesiones se inicializan automáticamente y no admiten creación o borrado manual.</p>
                  <div className="mt-4 h-px w-full bg-gradient-to-r from-gp-racingRed/80 via-gp-telemetryBlue/55 to-transparent" />

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.13em] text-gp-textSoft">Capacidad máxima por sesión: {maxCapacity} pilotos</span>
                    <Link
                      href={`/admin/events/${activeEventId}/time-attack`}
                      className="inline-flex items-center gap-2 rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition-colors duration-200 hover:bg-gp-telemetryBlue/20"
                    >
                      <span aria-hidden>←</span>
                      Volver a Time Attack
                    </Link>
                  </div>
                </article>

                {!isHydrated ? (
                  <div className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.7)] px-5 py-10 text-center text-sm uppercase tracking-[0.14em] text-gp-textSoft">
                    Cargando sesiones del evento...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {sessions.map((session) => (
                      <SessionCard key={session.id} session={session} onClose={closeSession} />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
