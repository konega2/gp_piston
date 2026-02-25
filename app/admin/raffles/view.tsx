'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { usePilots } from '@/context/PilotsContext';
import { loadModuleState, saveModuleState } from '@/lib/eventStateClient';

type RaffleRules = {
  onlyConfirmed: boolean;
  excludeDisqualified: boolean;
  excludePreviousWinners: boolean;
  only270: boolean;
  only390: boolean;
  onlyTimeAttack: boolean;
};

type RaffleWinner = {
  id: string;
  name: string;
  number: string;
};

type RaffleParticipantSnapshot = {
  id: string;
  name: string;
  number: string;
};

type RaffleRecord = {
  id: string;
  title: string;
  description: string;
  type: 'custom';
  rules: RaffleRules;
  allowDuplicates: boolean;
  winner: RaffleWinner | null;
  participantsSnapshot: RaffleParticipantSnapshot[];
  createdAt: number;
};

type RaffleHistoryEntry = {
  raffleId: string;
  raffleTitle: string;
  winnerId: string;
  winnerName: string;
  date: number;
};

type RaffleFormState = {
  title: string;
  description: string;
  allowDuplicates: boolean;
  rules: RaffleRules;
};

export default function RafflesPage() {
  const { activeEventId, isHydrated: activeEventHydrated } = useActiveEvent();
  const { pilots, isHydrated: pilotsHydrated } = usePilots();

  const [raffles, setRaffles] = useState<RaffleRecord[]>([]);
  const [history, setHistory] = useState<RaffleHistoryEntry[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRaffleId, setEditingRaffleId] = useState<string | null>(null);
  const [form, setForm] = useState<RaffleFormState>(buildDefaultFormState());

  useEffect(() => {
    if (!activeEventHydrated) {
      return;
    }

    setIsHydrated(false);

    void (async () => {
      try {
        const parsedRaffles = await loadModuleState<unknown>(activeEventId, 'raffles', []);
        setRaffles(normalizeRaffles(parsedRaffles));

        const parsedHistory = await loadModuleState<unknown>(activeEventId, 'rafflesHistory', []);
        setHistory(normalizeHistory(parsedHistory));
      } finally {
        setIsHydrated(true);
      }
    })();
  }, [activeEventHydrated, activeEventId]);

  useEffect(() => {
    if (!isHydrated || !activeEventHydrated) {
      return;
    }

    void saveModuleState(activeEventId, 'raffles', raffles);
  }, [isHydrated, activeEventHydrated, activeEventId, raffles]);

  useEffect(() => {
    if (!isHydrated || !activeEventHydrated) {
      return;
    }

    void saveModuleState(activeEventId, 'rafflesHistory', history);
  }, [isHydrated, activeEventHydrated, activeEventId, history]);

  const sortedRaffles = useMemo(
    () => [...raffles].sort((a, b) => b.createdAt - a.createdAt),
    [raffles]
  );

  const editingRaffle = useMemo(
    () => raffles.find((raffle) => raffle.id === editingRaffleId) ?? null,
    [raffles, editingRaffleId]
  );

  const hasLockedRules = Boolean(editingRaffle?.winner);

  const openCreateModal = () => {
    setEditingRaffleId(null);
    setForm(buildDefaultFormState());
    setError('');
    setFeedback('');
    setIsModalOpen(true);
  };

  const openEditModal = (raffle: RaffleRecord) => {
    setEditingRaffleId(raffle.id);
    setForm({
      title: raffle.title,
      description: raffle.description,
      allowDuplicates: raffle.allowDuplicates,
      rules: { ...raffle.rules }
    });
    setError('');
    setFeedback('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRaffleId(null);
    setForm(buildDefaultFormState());
  };

  const handleSaveRaffle = () => {
    const title = form.title.trim();
    if (title.length === 0) {
      setError('El título del sorteo es obligatorio.');
      return;
    }

    if (editingRaffle) {
      setRaffles((prev) =>
        prev.map((raffle) => {
          if (raffle.id !== editingRaffle.id) {
            return raffle;
          }

          return {
            ...raffle,
            title,
            description: form.description.trim(),
            allowDuplicates: form.allowDuplicates,
            rules: raffle.winner ? raffle.rules : { ...form.rules }
          };
        })
      );
      setFeedback('Sorteo actualizado correctamente.');
    } else {
      const nextRaffle: RaffleRecord = {
        id: createRaffleId(),
        title,
        description: form.description.trim(),
        type: 'custom',
        rules: { ...form.rules },
        allowDuplicates: form.allowDuplicates,
        winner: null,
        participantsSnapshot: [],
        createdAt: Date.now()
      };

      setRaffles((prev) => [nextRaffle, ...prev]);
      setFeedback('Sorteo creado correctamente.');
    }

    setError('');
    closeModal();
  };

  const handleDeleteRaffle = (raffleId: string) => {
    setRaffles((prev) => prev.filter((raffle) => raffle.id !== raffleId));
    setHistory((prev) => prev.filter((entry) => entry.raffleId !== raffleId));
    setFeedback('Sorteo eliminado.');
    setError('');
  };

  const handleResetRaffle = (raffleId: string) => {
    setRaffles((prev) =>
      prev.map((raffle) =>
        raffle.id === raffleId
          ? {
              ...raffle,
              winner: null,
              participantsSnapshot: []
            }
          : raffle
      )
    );
    setHistory((prev) => prev.filter((entry) => entry.raffleId !== raffleId));
    setFeedback('Sorteo reseteado correctamente.');
    setError('');
  };

  const handleDrawWinner = (raffleId: string) => {
    const raffle = raffles.find((item) => item.id === raffleId);
    if (!raffle || raffle.winner) {
      return;
    }

    const participants = buildValidParticipants(raffle, pilots, history);

    if (participants.length === 0) {
      setError('No hay participantes válidos para este sorteo con las reglas actuales.');
      setFeedback('');
      return;
    }

    const randomIndex = Math.floor(Math.random() * participants.length);
    const winner = participants[randomIndex] ?? null;

    if (!winner) {
      setError('No se pudo seleccionar un ganador.');
      setFeedback('');
      return;
    }

    setRaffles((prev) =>
      prev.map((item) =>
        item.id === raffleId
          ? {
              ...item,
              winner,
              participantsSnapshot: participants
            }
          : item
      )
    );

    const nextHistory: RaffleHistoryEntry = {
      raffleId: raffle.id,
      raffleTitle: raffle.title,
      winnerId: winner.id,
      winnerName: winner.name,
      date: Date.now()
    };

    setHistory((prev) => [nextHistory, ...prev.filter((entry) => entry.raffleId !== raffle.id)]);
    setFeedback(`Ganador sorteado: ${winner.name}`);
    setError('');
  };

  return (
    <main className="min-h-screen bg-gp-bg text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar activeItem="events" />

        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(0,207,255,0.09),transparent_42%),radial-gradient(circle_at_85%_18%,rgba(225,6,0,0.08),transparent_40%),linear-gradient(to_bottom,#0A0F16,#0A0F16)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-size:11px_11px] [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />

          <div className="relative z-10">
            <Header title="RAFFLES" subtitle="Gestión de sorteos del evento" />

            <section className="px-5 py-6 sm:px-6">
              <div className="mx-auto max-w-7xl space-y-5">
                <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">MÓDULO DE SORTEOS</p>
                      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.14em] text-white">RAFFLES</h1>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={openCreateModal}
                        className="rounded-xl border border-gp-stateGreen/55 bg-gp-stateGreen/[0.2] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-green-100 transition-all duration-200 hover:bg-gp-stateGreen/[0.3]"
                      >
                        + Crear Sorteo
                      </button>

                      <Link
                        href={`/admin/events/${activeEventId}/raffles/history`}
                        className="rounded-xl border border-gp-telemetryBlue/55 bg-gp-telemetryBlue/[0.18] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-cyan-100 transition-all duration-200 hover:bg-gp-telemetryBlue/[0.28]"
                      >
                        Ver historial
                      </Link>
                    </div>
                  </div>

                  {error ? (
                    <div className="mt-4 rounded-lg border border-gp-racingRed/45 bg-gp-racingRed/10 px-4 py-3 text-xs uppercase tracking-[0.13em] text-red-200">
                      {error}
                    </div>
                  ) : null}

                  {feedback ? (
                    <div className="mt-4 rounded-lg border border-gp-stateGreen/45 bg-gp-stateGreen/10 px-4 py-3 text-xs uppercase tracking-[0.13em] text-green-200">
                      {feedback}
                    </div>
                  ) : null}

                  <div className="mt-4 h-px w-full bg-gradient-to-r from-gp-racingRed/80 via-gp-telemetryBlue/55 to-transparent" />
                </article>

                {!isHydrated || !pilotsHydrated ? (
                  <div className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.7)] px-5 py-10 text-center text-sm uppercase tracking-[0.14em] text-gp-textSoft">
                    Cargando sorteos del evento...
                  </div>
                ) : sortedRaffles.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.7)] px-5 py-10 text-center text-sm uppercase tracking-[0.14em] text-gp-textSoft">
                    No hay sorteos creados todavía.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {sortedRaffles.map((raffle) => {
                      const isDrawn = Boolean(raffle.winner);

                      return (
                        <article
                          key={raffle.id}
                          className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-4 shadow-panel-deep backdrop-blur-xl"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h2 className="text-lg font-semibold uppercase tracking-[0.12em] text-white">{raffle.title}</h2>
                              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-gp-textSoft">
                                {raffle.description || 'Sin descripción'}
                              </p>
                            </div>
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                                isDrawn
                                  ? 'border-amber-400/50 bg-amber-400/15 text-amber-200'
                                  : 'border-gp-stateGreen/55 bg-gp-stateGreen/15 text-green-200'
                              }`}
                            >
                              {isDrawn ? '🏆 Sorteado' : 'Pendiente'}
                            </span>
                          </div>

                          <div className="mt-3 h-px w-full bg-gradient-to-r from-gp-racingRed/70 via-gp-telemetryBlue/50 to-transparent" />

                          <div className="mt-3 space-y-2 text-xs uppercase tracking-[0.12em]">
                            <p className="text-gp-textSoft">Tipo: {raffle.type}</p>
                            <p className="text-gp-textSoft">Duplicados: {raffle.allowDuplicates ? 'Permitidos' : 'No permitidos'}</p>
                            <p className="text-gp-textSoft">
                              Ganador:{' '}
                              <span className="font-semibold text-white">
                                {raffle.winner ? `${raffle.winner.name} (#${raffle.winner.number})` : 'Sin sortear'}
                              </span>
                            </p>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleDrawWinner(raffle.id)}
                              disabled={isDrawn}
                              className="rounded-lg border border-gp-stateGreen/55 bg-gp-stateGreen/[0.15] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-green-100 transition-all duration-200 hover:bg-gp-stateGreen/[0.25] disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              Sortear ganador
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(raffle)}
                              className="rounded-lg border border-gp-telemetryBlue/55 bg-gp-telemetryBlue/[0.12] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-100 transition-all duration-200 hover:bg-gp-telemetryBlue/[0.22]"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRaffle(raffle.id)}
                              className="rounded-lg border border-gp-racingRed/45 bg-gp-racingRed/[0.12] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-red-100 transition-all duration-200 hover:bg-gp-racingRed/[0.22]"
                            >
                              Eliminar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResetRaffle(raffle.id)}
                              className="rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gp-textSoft transition-all duration-200 hover:border-gp-telemetryBlue/45 hover:text-white"
                            >
                              Resetear sorteo
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
            aria-label="Cerrar formulario de sorteo"
          />

          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[rgba(10,15,22,0.94)] shadow-panel-deep">
            <div className="border-b border-white/10 px-6 py-5">
              <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">{editingRaffle ? 'Editar sorteo' : 'Crear sorteo'}</p>
              <h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.14em] text-white">
                {editingRaffle ? editingRaffle.title : 'Nuevo sorteo'}
              </h2>
              {hasLockedRules ? (
                <p className="mt-2 text-xs uppercase tracking-[0.12em] text-amber-200">
                  Este sorteo ya tiene ganador. Resetea el sorteo para cambiar reglas de participación.
                </p>
              ) : null}
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[11px] uppercase tracking-[0.13em] text-gp-textSoft">Título</span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="h-10 w-full rounded-lg border border-white/15 bg-[#0E141F] px-3 text-sm text-white outline-none transition-all duration-200 focus:border-gp-telemetryBlue/55"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] uppercase tracking-[0.13em] text-gp-textSoft">Permitir duplicados</span>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, allowDuplicates: !prev.allowDuplicates }))}
                    className={`h-10 w-full rounded-lg border px-3 text-sm font-semibold uppercase tracking-[0.12em] transition-colors ${
                      form.allowDuplicates
                        ? 'border-gp-stateGreen/55 bg-gp-stateGreen/15 text-green-200'
                        : 'border-gp-racingRed/45 bg-gp-racingRed/10 text-red-200'
                    }`}
                  >
                    {form.allowDuplicates ? 'Sí' : 'No'}
                  </button>
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-[11px] uppercase tracking-[0.13em] text-gp-textSoft">Descripción</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="min-h-[90px] w-full rounded-lg border border-white/15 bg-[#0E141F] px-3 py-2 text-sm text-white outline-none transition-all duration-200 focus:border-gp-telemetryBlue/55"
                />
              </label>

              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.13em] text-gp-textSoft">Reglas de participación</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {renderRuleOption('Solo pilotos confirmados', 'onlyConfirmed', form, setForm, hasLockedRules)}
                  {renderRuleOption('Excluir descalificados', 'excludeDisqualified', form, setForm, hasLockedRules)}
                  {renderRuleOption('Excluir ganadores anteriores', 'excludePreviousWinners', form, setForm, hasLockedRules)}
                  {renderRuleOption('Solo categoría 270cc', 'only270', form, setForm, hasLockedRules)}
                  {renderRuleOption('Solo categoría 390cc', 'only390', form, setForm, hasLockedRules)}
                  {renderRuleOption('Solo con Time Attack', 'onlyTimeAttack', form, setForm, hasLockedRules)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-gp-textSoft transition-colors hover:border-white/20 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveRaffle}
                className="rounded-lg border border-gp-stateGreen/55 bg-gp-stateGreen/[0.2] px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-green-100 transition-colors hover:bg-gp-stateGreen/[0.3]"
              >
                Guardar sorteo
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function renderRuleOption(
  label: string,
  key: keyof RaffleRules,
  form: RaffleFormState,
  setForm: React.Dispatch<React.SetStateAction<RaffleFormState>>,
  disabled: boolean
) {
  return (
    <button
      key={key}
      type="button"
      onClick={() => {
        if (disabled) {
          return;
        }

        setForm((prev) => ({
          ...prev,
          rules: {
            ...prev.rules,
            [key]: !prev.rules[key]
          }
        }));
      }}
      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
        form.rules[key]
          ? 'border-gp-stateGreen/55 bg-gp-stateGreen/15 text-green-200'
          : 'border-white/10 bg-white/[0.03] text-gp-textSoft'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-gp-telemetryBlue/40 hover:text-cyan-200'}`}
    >
      <span>{label}</span>
      <span>{form.rules[key] ? '✓' : '—'}</span>
    </button>
  );
}

function buildDefaultFormState(): RaffleFormState {
  return {
    title: '',
    description: '',
    allowDuplicates: false,
    rules: {
      onlyConfirmed: false,
      excludeDisqualified: false,
      excludePreviousWinners: false,
      only270: false,
      only390: false,
      onlyTimeAttack: false
    }
  };
}

function normalizeRaffles(value: unknown): RaffleRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is RaffleRecord => Boolean(item) && typeof (item as RaffleRecord).id === 'string')
    .map((item) => ({
      id: item.id,
      title: typeof item.title === 'string' ? item.title : 'Sorteo',
      description: typeof item.description === 'string' ? item.description : '',
      type: 'custom',
      rules: {
        onlyConfirmed: Boolean(item.rules?.onlyConfirmed),
        excludeDisqualified: Boolean(item.rules?.excludeDisqualified),
        excludePreviousWinners: Boolean(item.rules?.excludePreviousWinners),
        only270: Boolean(item.rules?.only270),
        only390: Boolean(item.rules?.only390),
        onlyTimeAttack: Boolean(item.rules?.onlyTimeAttack)
      },
      allowDuplicates: Boolean(item.allowDuplicates),
      winner:
        item.winner && typeof item.winner.id === 'string' && typeof item.winner.name === 'string' && typeof item.winner.number === 'string'
          ? item.winner
          : null,
      participantsSnapshot: Array.isArray(item.participantsSnapshot)
        ? item.participantsSnapshot.filter(
            (participant): participant is RaffleParticipantSnapshot =>
              Boolean(participant) &&
              typeof participant.id === 'string' &&
              typeof participant.name === 'string' &&
              typeof participant.number === 'string'
          )
        : [],
      createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now()
    }));
}

function normalizeHistory(value: unknown): RaffleHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is RaffleHistoryEntry =>
        Boolean(item) &&
        typeof (item as RaffleHistoryEntry).raffleId === 'string' &&
        typeof (item as RaffleHistoryEntry).winnerId === 'string'
    )
    .map((item) => ({
      raffleId: item.raffleId,
      raffleTitle: typeof item.raffleTitle === 'string' ? item.raffleTitle : 'Sorteo',
      winnerId: item.winnerId,
      winnerName: typeof item.winnerName === 'string' ? item.winnerName : 'Piloto',
      date: typeof item.date === 'number' ? item.date : Date.now()
    }))
    .sort((a, b) => b.date - a.date);
}

function buildValidParticipants(
  raffle: RaffleRecord,
  pilots: Array<{
    id: string;
    nombre: string;
    apellidos: string;
    numeroPiloto: number;
    kart: '270cc' | '390cc';
    hasTimeAttack: boolean;
  }>,
  history: RaffleHistoryEntry[]
): RaffleParticipantSnapshot[] {
  const previousWinnerIds = new Set(history.map((item) => item.winnerId));
  const sameTypeWinnerIds = new Set(
    history
      .filter((item) => item.raffleTitle.trim().toLowerCase() === raffle.title.trim().toLowerCase())
      .map((item) => item.winnerId)
  );

  return pilots
    .filter((pilot) => {
      const flexiblePilot = pilot as typeof pilot & { confirmed?: boolean; disqualified?: boolean };

      if (raffle.rules.onlyConfirmed && flexiblePilot.confirmed === false) {
        return false;
      }

      if (raffle.rules.excludeDisqualified && flexiblePilot.disqualified === true) {
        return false;
      }

      if (raffle.rules.excludePreviousWinners && previousWinnerIds.has(pilot.id)) {
        return false;
      }

      if (!raffle.allowDuplicates && sameTypeWinnerIds.has(pilot.id)) {
        return false;
      }

      if (raffle.rules.only270 && pilot.kart !== '270cc') {
        return false;
      }

      if (raffle.rules.only390 && pilot.kart !== '390cc') {
        return false;
      }

      if (raffle.rules.onlyTimeAttack && !pilot.hasTimeAttack) {
        return false;
      }

      if (raffle.rules.only270 && raffle.rules.only390) {
        return false;
      }

      return true;
    })
    .map((pilot) => ({
      id: pilot.id,
      name: `${pilot.nombre} ${pilot.apellidos}`,
      number: String(pilot.numeroPiloto)
    }));
}

function createRaffleId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `raffle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
