import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { getEventById } from '@/lib/events';
import { updateEventAction } from '@/app/admin/events/actions';

export const dynamic = 'force-dynamic';

const toDateInput = (value: string | Date | null) => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
};

export default async function EditEventPage({
  params,
  searchParams
}: {
  params: {
    eventId: string;
  };
  searchParams?: {
    error?: string;
  };
}) {
  const eventData = await getEventById(params.eventId);
  const error = searchParams?.error ?? '';

  if (!eventData) {
    return (
      <main className="min-h-screen bg-gp-bg text-white">
        <div className="relative min-h-screen overflow-hidden">
          <div className="relative z-10">
            <Header title="EDITAR EVENTO" subtitle="Actualización de configuración" />
            <section className="px-5 py-6 sm:px-6">
              <div className="mx-auto max-w-5xl rounded-lg border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-xs uppercase tracking-[0.13em] text-gp-textSoft">
                Evento no encontrado.
              </div>
            </section>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gp-bg text-white">
      <div className="relative min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(0,207,255,0.09),transparent_42%),radial-gradient(circle_at_85%_18%,rgba(225,6,0,0.08),transparent_40%),linear-gradient(to_bottom,#0A0F16,#0A0F16)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-size:11px_11px] [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />

        <div className="relative z-10">
          <Header title="EDITAR EVENTO" subtitle="Actualización de configuración operativa" />

          <section className="px-5 py-6 sm:px-6">
            <form action={updateEventAction} className="mx-auto max-w-5xl space-y-5">
              <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                <input type="hidden" name="eventId" value={eventData.id} />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">EDITAR EVENTO</p>
                  <Link
                    href="/admin/events/list"
                    className="inline-flex items-center gap-2 rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition-colors duration-200 hover:bg-gp-telemetryBlue/20"
                  >
                    <span aria-hidden>←</span>
                    Volver al listado
                  </Link>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Nombre" name="name" defaultValue={eventData.name} />
                  <Field label="Fecha" name="date" type="date" defaultValue={toDateInput(eventData.date)} />
                  <Field label="Ubicación" name="location" defaultValue={eventData.location ?? ''} />
                  <Field
                    label="Máx participantes"
                    name="maxParticipants"
                    type="number"
                    defaultValue={String(eventData.config?.maxPilots ?? 20)}
                  />
                  <Field
                    label="Capacidad TA/sesión"
                    name="sessionMaxCapacity"
                    type="number"
                    defaultValue={String(eventData.config?.sessionMaxCapacity ?? 20)}
                  />
                  <Field
                    label="Cantidad equipos"
                    name="teamsCount"
                    type="number"
                    defaultValue={String(eventData.config?.teamsCount ?? 5)}
                  />
                  <Field
                    label="Sesiones TA"
                    name="timeAttackSessions"
                    type="number"
                    defaultValue={String(eventData.config?.timeAttackSessions ?? 5)}
                  />
                  <Field
                    label="Grupos Qualy"
                    name="qualyGroups"
                    type="number"
                    defaultValue={String(eventData.config?.qualyGroups ?? 3)}
                  />
                  <Field
                    label="Cantidad carreras"
                    name="raceCount"
                    type="number"
                    defaultValue={String(eventData.config?.raceCount ?? 2)}
                  />
                </div>

                {error ? (
                  <div className="mt-4 rounded-lg border border-gp-racingRed/45 bg-gp-racingRed/10 px-4 py-3 text-xs uppercase tracking-[0.13em] text-red-200">{error}</div>
                ) : null}

                <button
                  type="submit"
                  className="mt-4 rounded-lg border border-gp-stateGreen/45 bg-gp-stateGreen/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-green-200 transition-colors duration-200 hover:bg-gp-stateGreen/20 hover:text-white"
                >
                  Guardar cambios
                </button>
              </article>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = 'text'
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: 'text' | 'number' | 'date';
}) {
  return (
    <label className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">{label}</p>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required
        min={type === 'number' ? 1 : undefined}
        className="mt-2 w-full bg-transparent text-sm uppercase tracking-[0.08em] text-white outline-none"
      />
    </label>
  );
}
