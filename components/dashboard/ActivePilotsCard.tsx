'use client';

import { useMemo } from 'react';
import { useClassification } from '@/context/ClassificationContext';
import { usePilots } from '@/context/PilotsContext';
import { useTimeAttackSessions } from '@/context/TimeAttackContext';

export function ActivePilotsCard() {
  const { pilots, isHydrated: pilotsHydrated } = usePilots();
  const { sessions, isHydrated: taHydrated } = useTimeAttackSessions();
  const { qualySessions, isHydrated: qualyHydrated } = useClassification();

  const stats = useMemo(() => {
    const timeAttackAssigned = new Set(sessions.flatMap((session) => session.assignedPilots)).size;
    const qualyAssigned = new Set(qualySessions.flatMap((session) => session.assignedPilots)).size;
    const taLaps = sessions.reduce((acc, session) => acc + session.times.length, 0);
    const qualyTimes = qualySessions.reduce((acc, session) => acc + session.times.length, 0);

    return {
      activePilots: pilots.length,
      timeAttackAssigned,
      qualyAssigned,
      taLaps,
      qualyTimes
    };
  }, [pilots.length, qualySessions, sessions]);

  const isHydrated = pilotsHydrated && taHydrated && qualyHydrated;

  return (
    <article className="group relative max-w-xl animate-fade-in rounded-2xl bg-card-border p-[1px] shadow-panel-deep transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_58px_rgba(0,0,0,0.62),0_0_24px_rgba(0,207,255,0.12)]">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.7)] px-6 py-7 backdrop-blur-xl sm:px-8">
        <CornerDetails />

        <p className="text-[11px] uppercase tracking-[0.16em] text-gp-textSoft">ESTADO ACTUAL</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[0.04em] text-white sm:text-3xl">Pilotos Activos</h2>

        <div className="mt-6 text-center">
          <p className="text-7xl font-semibold leading-none text-white sm:text-8xl">{isHydrated ? stats.activePilots : '--'}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.14em] text-gp-textSoft">Registrados en el campeonato</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            TA asignados: <span className="font-semibold text-cyan-200">{isHydrated ? stats.timeAttackAssigned : '--'}</span>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            Qualy asignados: <span className="font-semibold text-cyan-200">{isHydrated ? stats.qualyAssigned : '--'}</span>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            Vueltas TA: <span className="font-semibold text-cyan-200">{isHydrated ? stats.taLaps : '--'}</span>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            Tiempos Qualy: <span className="font-semibold text-cyan-200">{isHydrated ? stats.qualyTimes : '--'}</span>
          </div>
        </div>

        <div className="mx-auto mt-6 h-[2px] w-44 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-telemetry-scan bg-gradient-to-r from-gp-racingRed via-gp-telemetryBlue to-transparent" />
        </div>
      </section>
    </article>
  );
}

function CornerDetails() {
  return (
    <>
      <span className="pointer-events-none absolute left-3 top-3 h-4 w-4 border-l border-t border-gp-telemetryBlue/45" />
      <span className="pointer-events-none absolute right-3 top-3 h-4 w-4 border-r border-t border-gp-racingRed/45" />
      <span className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 border-b border-l border-gp-racingRed/45" />
      <span className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 border-b border-r border-gp-telemetryBlue/45" />
    </>
  );
}
