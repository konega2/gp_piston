'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { getEventById, updateEvent, type EventRecord } from '@/lib/eventStorage';

type FormState = {
  name: string;
  date: string;
  location: string;
  maxParticipants: string;
  sessionMaxCapacity: string;
  teamsCount: string;
  timeAttackSessions: string;
  qualyGroups: string;
  raceCount: string;
};

export default function EditEventPage({
  params
}: {
  params: {
    eventId: string;
  };
}) {
  const router = useRouter();
  const [eventData, setEventData] = useState<EventRecord | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const found = getEventById(params.eventId);
    if (!found) {
      setError('Evento no encontrado.');
      return;
    }

    setEventData(found);
    setForm({
      name: found.name,
      date: found.date,
      location: found.location,
      maxParticipants: String(found.maxParticipants ?? 20),
      sessionMaxCapacity: String(found.sessionMaxCapacity ?? 20),
      teamsCount: String(found.teamsCount ?? 5),
      timeAttackSessions: String(found.timeAttackSessions ?? 5),
      qualyGroups: String(found.qualyGroups ?? 3),
      raceCount: String(found.raceCount ?? 2)
    });
  }, [params.eventId]);

  const isValid = useMemo(() => {
    if (!form) {
      return false;
    }

    return (
      form.name.trim().length > 0 &&
      form.date.trim().length > 0 &&
      form.location.trim().length > 0 &&
      Number(form.maxParticipants) > 0 &&
      Number(form.sessionMaxCapacity) > 0 &&
      Number(form.teamsCount) > 0 &&
      Number(form.timeAttackSessions) > 0 &&
      Number(form.qualyGroups) > 0 &&
      Number(form.raceCount) > 0
    );
  }, [form]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!eventData || !form || !isValid) {
      setError('Completa todos los campos con valores válidos.');
      return;
    }

    const updatedEvent: EventRecord = {
      ...eventData,
      name: form.name.trim(),
      date: form.date,
      location: form.location.trim(),
      maxParticipants: Number(form.maxParticipants),
      sessionMaxCapacity: Number(form.sessionMaxCapacity),
      teamsCount: Number(form.teamsCount),
      timeAttackSessions: Number(form.timeAttackSessions),
      qualyGroups: Number(form.qualyGroups),
      raceCount: Number(form.raceCount)
    };

    updateEvent(updatedEvent);
    router.push('/admin/events/list');
  };

  if (!form) {
    return (
      <main className="min-h-screen bg-gp-bg text-white">
        <div className="relative min-h-screen overflow-hidden">
          <div className="relative z-10">
            <Header title="EDITAR EVENTO" subtitle="Actualización de configuración" />
            <section className="px-5 py-6 sm:px-6">
              <div className="mx-auto max-w-5xl rounded-lg border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-xs uppercase tracking-[0.13em] text-gp-textSoft">
                {error || 'Cargando evento...'}
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
            <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-5">
              <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
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
                  <Field label="Nombre" value={form.name} onChange={(value) => setForm((prev) => (prev ? { ...prev, name: value } : prev))} />
                  <Field label="Fecha" type="date" value={form.date} onChange={(value) => setForm((prev) => (prev ? { ...prev, date: value } : prev))} />
                  <Field label="Ubicación" value={form.location} onChange={(value) => setForm((prev) => (prev ? { ...prev, location: value } : prev))} />
                  <Field
                    label="Máx participantes"
                    type="number"
                    value={form.maxParticipants}
                    onChange={(value) => setForm((prev) => (prev ? { ...prev, maxParticipants: value } : prev))}
                  />
                  <Field
                    label="Capacidad TA/sesión"
                    type="number"
                    value={form.sessionMaxCapacity}
                    onChange={(value) => setForm((prev) => (prev ? { ...prev, sessionMaxCapacity: value } : prev))}
                  />
                  <Field
                    label="Cantidad equipos"
                    type="number"
                    value={form.teamsCount}
                    onChange={(value) => setForm((prev) => (prev ? { ...prev, teamsCount: value } : prev))}
                  />
                  <Field
                    label="Sesiones TA"
                    type="number"
                    value={form.timeAttackSessions}
                    onChange={(value) => setForm((prev) => (prev ? { ...prev, timeAttackSessions: value } : prev))}
                  />
                  <Field
                    label="Grupos Qualy"
                    type="number"
                    value={form.qualyGroups}
                    onChange={(value) => setForm((prev) => (prev ? { ...prev, qualyGroups: value } : prev))}
                  />
                  <Field
                    label="Cantidad carreras"
                    type="number"
                    value={form.raceCount}
                    onChange={(value) => setForm((prev) => (prev ? { ...prev, raceCount: value } : prev))}
                  />
                </div>

                {error ? (
                  <div className="mt-4 rounded-lg border border-gp-racingRed/45 bg-gp-racingRed/10 px-4 py-3 text-xs uppercase tracking-[0.13em] text-red-200">{error}</div>
                ) : null}

                <button
                  type="submit"
                  disabled={!isValid}
                  className="mt-4 rounded-lg border border-gp-stateGreen/45 bg-gp-stateGreen/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-green-200 transition-colors duration-200 hover:bg-gp-stateGreen/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
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
  value,
  onChange,
  type = 'text'
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'date';
}) {
  return (
    <label className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">{label}</p>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full bg-transparent text-sm uppercase tracking-[0.08em] text-white outline-none"
      />
    </label>
  );
}
