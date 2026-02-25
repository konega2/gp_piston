'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { loadEventStorageItem } from '@/lib/eventStorage';

type RaffleHistoryEntry = {
  raffleId: string;
  raffleTitle: string;
  winnerId: string;
  winnerName: string;
  date: number;
};

const RAFFLES_HISTORY_STORAGE_KEY = 'rafflesHistory';

export default function RafflesHistoryPage() {
  const { activeEventId, isHydrated: activeEventHydrated } = useActiveEvent();
  const [history, setHistory] = useState<RaffleHistoryEntry[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!activeEventHydrated) {
      return;
    }

    setIsHydrated(false);

    try {
      const raw = loadEventStorageItem(RAFFLES_HISTORY_STORAGE_KEY, activeEventId);
      if (!raw) {
        setHistory([]);
        return;
      }

      const parsed = JSON.parse(raw) as unknown;
      setHistory(normalizeHistory(parsed));
    } finally {
      setIsHydrated(true);
    }
  }, [activeEventHydrated, activeEventId]);

  const sortedHistory = useMemo(() => [...history].sort((a, b) => b.date - a.date), [history]);

  return (
    <main className="min-h-screen bg-gp-bg text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar activeItem="events" />

        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(0,207,255,0.09),transparent_42%),radial-gradient(circle_at_85%_18%,rgba(225,6,0,0.08),transparent_40%),linear-gradient(to_bottom,#0A0F16,#0A0F16)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-size:11px_11px] [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />

          <div className="relative z-10">
            <Header title="RAFFLES" subtitle="Historial de sorteos del evento" />

            <section className="px-5 py-6 sm:px-6">
              <div className="mx-auto max-w-7xl space-y-5">
                <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">MÓDULO DE SORTEOS</p>
                      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.14em] text-white">HISTORIAL</h1>
                    </div>

                    <Link
                      href={`/admin/events/${activeEventId}/raffles`}
                      className="inline-flex items-center gap-2 rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition-colors duration-200 hover:bg-gp-telemetryBlue/20"
                    >
                      <span aria-hidden>←</span>
                      Volver a Sorteos
                    </Link>
                  </div>

                  <div className="mt-4 h-px w-full bg-gradient-to-r from-gp-racingRed/80 via-gp-telemetryBlue/55 to-transparent" />
                </article>

                {!isHydrated ? (
                  <div className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.7)] px-5 py-10 text-center text-sm uppercase tracking-[0.14em] text-gp-textSoft">
                    Cargando historial...
                  </div>
                ) : sortedHistory.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.7)] px-5 py-10 text-center text-sm uppercase tracking-[0.14em] text-gp-textSoft">
                    No hay sorteos realizados todavía.
                  </div>
                ) : (
                  <article className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] shadow-panel-deep backdrop-blur-xl">
                    <table className="w-full text-sm">
                      <thead className="bg-white/[0.03]">
                        <tr className="text-left text-[11px] uppercase tracking-[0.13em] text-gp-textSoft">
                          <th className="px-4 py-3">Sorteo</th>
                          <th className="px-4 py-3">Ganador</th>
                          <th className="px-4 py-3">Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedHistory.map((entry) => (
                          <tr key={`${entry.raffleId}-${entry.winnerId}-${entry.date}`} className="border-t border-white/10 bg-white/[0.01]">
                            <td className="px-4 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-white">{entry.raffleTitle}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-cyan-200">{entry.winnerName}</td>
                            <td className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-gp-textSoft">
                              {new Date(entry.date).toLocaleString('es-ES')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </article>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
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
    }));
}
