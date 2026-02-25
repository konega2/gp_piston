"use client";

import { useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { PilotCard } from '@/components/pilots/PilotCard';
import { PilotFilters } from '@/components/pilots/PilotFilters';
import { PilotKart, PilotLevel } from '@/data/pilots';
import { usePilots } from '@/context/PilotsContext';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { useEventRuntimeConfig } from '@/lib/event-client';

type LevelFilter = PilotLevel | 'ALL';
type KartFilter = PilotKart | 'ALL';

export default function PilotsListPage() {
  const { pilots } = usePilots();
  const { activeEventId } = useActiveEvent();
  const runtimeConfig = useEventRuntimeConfig(activeEventId);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('ALL');
  const [kartFilter, setKartFilter] = useState<KartFilter>('ALL');
  const maxPilots = useMemo(() => runtimeConfig?.maxPilots ?? 0, [runtimeConfig]);

  const filteredPilots = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return pilots
      .filter((pilot) => {
      const fullName = `${pilot.nombre} ${pilot.apellidos}`.toLowerCase();
      const matchesName = normalizedSearch.length === 0 || fullName.includes(normalizedSearch);
      const matchesLevel = levelFilter === 'ALL' || pilot.nivel === levelFilter;
      const matchesKart = kartFilter === 'ALL' || pilot.kart === kartFilter;

      return matchesName && matchesLevel && matchesKart;
      })
      .sort((a, b) => a.numeroPiloto - b.numeroPiloto);
  }, [pilots, searchTerm, levelFilter, kartFilter]);

  return (
    <main className="min-h-screen bg-gp-bg text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar activeItem="pilotos" />

        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(0,207,255,0.08),transparent_42%),radial-gradient(circle_at_85%_18%,rgba(225,6,0,0.08),transparent_40%),linear-gradient(to_bottom,#0A0F16,#0A0F16)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-size:11px_11px] [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />
          <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(to_bottom,rgba(184,194,212,0.1)_0,rgba(184,194,212,0.1)_1px,transparent_1px,transparent_44px)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_40%_8%,rgba(0,207,255,0.07),transparent_48%)]" />

          <div className="relative z-10">
            <Header title="PILOTOS" subtitle="Listado operativo del campeonato" />

            <section className="px-5 py-6 sm:px-6">
              <div className="mx-auto max-w-7xl space-y-5">
                <PilotFilters
                  searchTerm={searchTerm}
                  levelFilter={levelFilter}
                  kartFilter={kartFilter}
                  totalPilots={pilots.length}
                  visiblePilots={filteredPilots.length}
                  maxPilots={maxPilots}
                  onSearchChange={setSearchTerm}
                  onLevelChange={setLevelFilter}
                  onKartChange={setKartFilter}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {filteredPilots.map((pilot) => (
                    <PilotCard key={pilot.id} pilot={pilot} />
                  ))}
                </div>

                {filteredPilots.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] px-5 py-8 text-center text-sm uppercase tracking-[0.14em] text-gp-textSoft">
                    No se encontraron pilotos con los filtros actuales.
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
