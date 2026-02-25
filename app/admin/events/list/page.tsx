import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { getEvents, type EventRow } from '@/lib/events';
import { deleteEventAction } from '@/app/admin/events/actions';

export const dynamic = 'force-dynamic';

const toDateLabel = (value: EventRow['date']) => {
  if (!value) return 'Sin fecha';
  if (typeof value === 'string') return value;
  return value.toISOString().slice(0, 10);
};

export default async function EventsListPage({
  searchParams
}: {
  searchParams?: {
    success?: string;
    error?: string;
  };
}) {
  const events = await getEvents();
  const success = searchParams?.success ?? '';
  const error = searchParams?.error ?? '';

  return (
    <main className="min-h-screen bg-gp-bg text-white">
      <div className="relative min-h-screen overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(0,207,255,0.09),transparent_42%),radial-gradient(circle_at_85%_18%,rgba(225,6,0,0.08),transparent_40%),linear-gradient(to_bottom,#0A0F16,#0A0F16)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-size:11px_11px] [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />

          <div className="relative z-10">
            <Header title="EVENTOS" subtitle="Listado de eventos disponibles" />

            <section className="px-5 py-6 sm:px-6">
              <div className="mx-auto max-w-7xl space-y-5">
                <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">VER EVENTOS</p>
                    <Link
                      href="/admin/events"
                      className="inline-flex items-center gap-2 rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition-colors duration-200 hover:bg-gp-telemetryBlue/20"
                    >
                      <span aria-hidden>←</span>
                      Volver a selección
                    </Link>
                  </div>
                </article>

                {success ? (
                  <div className="rounded-lg border border-gp-stateGreen/45 bg-gp-stateGreen/10 px-4 py-3 text-xs uppercase tracking-[0.13em] text-green-200">{success}</div>
                ) : null}

                {error ? (
                  <div className="rounded-lg border border-gp-racingRed/45 bg-gp-racingRed/10 px-4 py-3 text-xs uppercase tracking-[0.13em] text-red-200">{error}</div>
                ) : null}

                {events.length === 0 ? (
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-xs uppercase tracking-[0.13em] text-gp-textSoft">
                    No hay eventos creados
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {events.map((event) => (
                      <article key={event.id} className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-4 shadow-panel-deep backdrop-blur-xl">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-gp-textSoft">{event.location ?? 'Sin ubicación'}</p>
                        <h2 className="mt-1 text-xl font-semibold uppercase tracking-[0.12em] text-white">{event.name}</h2>
                        <p className="mt-1 text-xs uppercase tracking-[0.11em] text-gp-textSoft">{toDateLabel(event.date)}</p>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.11em] text-gp-textSoft">
                          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1">Pilotos: {event.config?.maxPilots ?? 0}</div>
                          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1">Equipos: {event.config?.teamsCount ?? 0}</div>
                          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1">TA: {event.config?.timeAttackSessions ?? 0}</div>
                          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1">Carreras: {event.config?.raceCount ?? 0}</div>
                        </div>

                        <Link
                          href={`/admin/events/${event.id}/dashboard`}
                          className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-cyan-200 transition-colors duration-200 hover:bg-gp-telemetryBlue/20 hover:text-white"
                        >
                          Entrar
                        </Link>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <Link
                            href={`/admin/events/edit/${event.id}`}
                            className="inline-flex w-full items-center justify-center rounded-lg border border-white/20 bg-white/[0.03] px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-gp-textSoft transition-colors duration-200 hover:border-gp-telemetryBlue/45 hover:bg-gp-telemetryBlue/[0.12] hover:text-white"
                          >
                            Editar
                          </Link>

                          <form action={deleteEventAction} className="w-full">
                            <input type="hidden" name="eventId" value={event.id} />
                            <button
                              type="submit"
                              className="inline-flex w-full items-center justify-center rounded-lg border border-gp-racingRed/45 bg-gp-racingRed/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-red-200 transition-colors duration-200 hover:bg-gp-racingRed/20 hover:text-white"
                            >
                              Eliminar
                            </button>
                          </form>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
      </div>
    </main>
  );
}
