'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { initializeEventNamespace, loadEvents, saveEvents, type EventRecord } from '@/lib/eventStorage';

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

const INITIAL_FORM: FormState = {
  name: '',
  date: '',
  location: '',
  maxParticipants: '80',
  sessionMaxCapacity: '20',
  teamsCount: '10',
  timeAttackSessions: '5',
  qualyGroups: '3',
  raceCount: '2'
};

export default function CreateEventPage() {
  const { setActiveEventId } = useActiveEvent();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const isValid = useMemo(() => {
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

    if (!isValid) {
      setError('Completa todos los campos con valores válidos.');
      setFeedback('');
      return;
    }

    const createdEvent: EventRecord = {
      id: createEventId(form.name),
      name: form.name.trim(),
      date: form.date,
      location: form.location.trim(),
      status: 'activo',
      maxParticipants: Number(form.maxParticipants),
      sessionMaxCapacity: Number(form.sessionMaxCapacity),
      teamsCount: Number(form.teamsCount),
      timeAttackSessions: Number(form.timeAttackSessions),
      qualyGroups: Number(form.qualyGroups),
      raceCount: Number(form.raceCount),
      createdAt: Date.now()
    };

    const existing = loadEvents();
    const updated = [createdEvent, ...existing.filter((item) => item.id !== createdEvent.id)];
    saveEvents(updated);
    initializeEventNamespace(createdEvent.id, {
      maxPilots: createdEvent.maxParticipants ?? 20,
      timeAttackSessions: createdEvent.timeAttackSessions ?? 5,
      qualyGroups: createdEvent.qualyGroups ?? 3,
      teamsCount: createdEvent.teamsCount ?? 5
    });
    setActiveEventId(createdEvent.id);

    setForm(INITIAL_FORM);
    setError('');
    setFeedback(`Evento creado correctamente: ${createdEvent.name}.`);
  };

  return (
    <main className="min-h-screen bg-gp-bg text-white">
      <div className="relative min-h-screen overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(0,207,255,0.09),transparent_42%),radial-gradient(circle_at_85%_18%,rgba(225,6,0,0.08),transparent_40%),linear-gradient(to_bottom,#0A0F16,#0A0F16)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-size:11px_11px] [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />

          <div className="relative z-10">
            <Header title="CREAR EVENTO" subtitle="Configuración operativa multi-evento" />

            <section className="px-5 py-6 sm:px-6">
              <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-5">
                <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">NUEVO EVENTO</p>
                    <Link
                      href="/admin/events"
                      className="inline-flex items-center gap-2 rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition-colors duration-200 hover:bg-gp-telemetryBlue/20"
                    >
                      <span aria-hidden>←</span>
                      Volver
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Nombre" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
                    <Field label="Fecha" type="date" value={form.date} onChange={(value) => setForm((prev) => ({ ...prev, date: value }))} />
                    <Field label="Ubicación" value={form.location} onChange={(value) => setForm((prev) => ({ ...prev, location: value }))} />
                    <Field
                      label="Máx participantes"
                      type="number"
                      value={form.maxParticipants}
                      onChange={(value) => setForm((prev) => ({ ...prev, maxParticipants: value }))}
                    />
                    <Field
                      label="Capacidad TA/sesión"
                      type="number"
                      value={form.sessionMaxCapacity}
                      onChange={(value) => setForm((prev) => ({ ...prev, sessionMaxCapacity: value }))}
                    />
                    <Field
                      label="Cantidad equipos"
                      type="number"
                      value={form.teamsCount}
                      onChange={(value) => setForm((prev) => ({ ...prev, teamsCount: value }))}
                    />
                    <Field
                      label="Sesiones TA"
                      type="number"
                      value={form.timeAttackSessions}
                      onChange={(value) => setForm((prev) => ({ ...prev, timeAttackSessions: value }))}
                    />
                    <Field
                      label="Grupos Qualy"
                      type="number"
                      value={form.qualyGroups}
                      onChange={(value) => setForm((prev) => ({ ...prev, qualyGroups: value }))}
                    />
                    <Field
                      label="Cantidad carreras"
                      type="number"
                      value={form.raceCount}
                      onChange={(value) => setForm((prev) => ({ ...prev, raceCount: value }))}
                    />
                  </div>

                  {error ? (
                    <div className="mt-4 rounded-lg border border-gp-racingRed/45 bg-gp-racingRed/10 px-4 py-3 text-xs uppercase tracking-[0.13em] text-red-200">{error}</div>
                  ) : null}

                  {feedback ? (
                    <div className="mt-4 rounded-lg border border-gp-stateGreen/45 bg-gp-stateGreen/10 px-4 py-3 text-xs uppercase tracking-[0.13em] text-green-200">{feedback}</div>
                  ) : null}

                  <button
                    type="submit"
                    className="mt-4 rounded-lg border border-gp-stateGreen/45 bg-gp-stateGreen/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-green-200 transition-colors duration-200 hover:bg-gp-stateGreen/20 hover:text-white"
                  >
                    Guardar Evento
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

function createEventId(value: string) {
  const slug = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const base = slug.length > 0 ? slug : 'evento';
  return `${base}-${Date.now()}`;
}
