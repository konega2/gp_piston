'use client';

import Link from 'next/link';
import { PilotRecord } from '@/data/pilots';
import { useActiveEvent } from '@/context/ActiveEventContext';

type PilotCardProps = {
  pilot: PilotRecord;
};

export function PilotCard({ pilot }: PilotCardProps) {
  const { activeEventId } = useActiveEvent();
  const fullName = `${pilot.nombre} ${pilot.apellidos}`;
  const initials = `${pilot.nombre.charAt(0)}${pilot.apellidos.charAt(0)}`.toUpperCase();
  const fallbackPhoto = createInitialsPlaceholder(initials);

  return (
    <Link
      href={`/admin/events/${activeEventId}/pilotos/${pilot.id}`}
      className="group relative block animate-fade-in overflow-hidden rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-3 shadow-panel-deep backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:border-gp-racingRed/45 hover:shadow-[0_20px_48px_rgba(0,0,0,0.58),0_0_18px_rgba(225,6,0,0.2)]"
    >
      <span className="pointer-events-none absolute left-2 top-2 h-4 w-4 border-l border-t border-gp-telemetryBlue/45" />
      <span className="pointer-events-none absolute right-2 top-2 h-4 w-4 border-r border-t border-gp-racingRed/45" />

      <div className="relative">
        <span className="absolute right-2 top-2 z-10 rounded-md border border-white/15 bg-black/50 px-2 py-1 text-base font-semibold tracking-[0.12em] text-white">
          #{String(pilot.numeroPiloto).padStart(2, '0')}
        </span>

        <div className="aspect-square overflow-hidden rounded-xl border border-white/10 bg-[#0E141F]">
          <img src={pilot.foto ?? fallbackPhoto} alt={fullName} className="h-full w-full object-cover" />
        </div>
      </div>

      <div className="px-1 pb-1 pt-3 text-center">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white">{fullName}</h3>

        <p
          className={`mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${
            pilot.nivel === 'PRO'
              ? 'text-gp-racingRed'
              : pilot.nivel === 'AMATEUR'
                ? 'text-gp-telemetryBlue'
                : 'text-gp-textSoft'
          }`}
        >
          {pilot.nivel}
        </p>

        <div className="mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[11px] uppercase tracking-[0.12em]">
          <span className="text-gp-textSoft">Kart</span>
          <span className="font-semibold text-white">{pilot.kart}</span>
        </div>

        <div className="mt-2 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[11px] uppercase tracking-[0.12em]">
          <span className="text-gp-textSoft">Comisario/a</span>
          <span className={pilot.comisario ? 'font-semibold text-green-300' : 'font-semibold text-gp-textSoft'}>
            {pilot.comisario ? 'SI' : 'NO'}
          </span>
        </div>
      </div>
    </Link>
  );
}

function createInitialsPlaceholder(initials: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'>
    <defs>
      <linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stop-color='#142335'/>
        <stop offset='100%' stop-color='#2a5370'/>
      </linearGradient>
    </defs>
    <rect width='400' height='400' fill='url(#g)'/>
    <rect width='400' height='400' fill='rgba(10,15,22,0.2)'/>
    <text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='108' font-family='Arial, sans-serif' font-weight='700' letter-spacing='3'>${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
