'use client';

import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useActiveEvent } from '@/context/ActiveEventContext';

type EventLayoutProps = {
  children: React.ReactNode;
  params: {
    eventId: string;
  };
};

const navItems = [
  { label: 'Dashboard', href: 'dashboard', key: 'dashboard' },
  { label: 'Pilotos', href: 'pilotos', key: 'pilotos' },
  { label: 'Time Attack', href: 'time-attack', key: 'time-attack' },
  { label: 'Clasificación', href: 'classification', key: 'classification' },
  { label: 'Equipos', href: 'teams', key: 'teams' },
  { label: 'Carreras', href: 'races', key: 'races' },
  { label: 'Resultados', href: 'results', key: 'results' },
  { label: 'Estado del Evento', href: 'event-status', key: 'event-status' },
  { label: 'Sorteos', href: 'raffles', key: 'raffles' }
] as const;

export default function EventAdminLayout({ children, params }: EventLayoutProps) {
  const pathname = usePathname();
  const { setActiveEventId } = useActiveEvent();

  useEffect(() => {
    setActiveEventId(params.eventId);
  }, [params.eventId, setActiveEventId]);

  const activeKey = useMemo(() => {
    if (pathname.includes('/event-status')) return 'event-status';
    if (pathname.includes('/results')) return 'results';
    if (pathname.includes('/races')) return 'races';
    if (pathname.includes('/teams')) return 'teams';
    if (pathname.includes('/raffles')) return 'raffles';
    if (pathname.includes('/classification')) return 'classification';
    if (pathname.includes('/time-attack')) return 'time-attack';
    if (pathname.includes('/pilotos')) return 'pilotos';
    return 'dashboard';
  }, [pathname]);

  return (
    <div className="min-h-screen bg-gp-bg text-white lg:flex">
      <aside className="w-full border-b border-white/10 bg-[#0E141F] px-4 py-5 lg:min-h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
        <div>
          <p className="text-xl font-semibold uppercase tracking-technical text-white">GP PISTÓN</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">Evento activo</p>
          <div className="mt-3 h-px w-36 bg-gradient-to-r from-gp-racingRed/90 to-transparent" />
        </div>

        <nav className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:mt-8 lg:grid-cols-1 lg:gap-1.5">
          {navItems.map((item) => {
            const href = `/admin/events/${params.eventId}/${item.href}`;
            const isActive = activeKey === item.key;

            return (
              <Link
                key={item.key}
                href={href}
                className={`group relative flex items-center gap-3 rounded-lg border px-3 py-2.5 text-xs uppercase tracking-[0.14em] transition-all duration-200 ${
                  isActive
                    ? 'border-gp-racingRed/35 bg-white/[0.03] text-white'
                    : 'border-white/10 text-gp-textSoft hover:border-gp-telemetryBlue/35 hover:bg-gp-telemetryBlue/[0.06] hover:text-white'
                }`}
              >
                {isActive ? <span className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-gp-racingRed" /> : null}
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <Link
          href="/admin/events/list"
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-cyan-200 transition-colors duration-200 hover:bg-gp-telemetryBlue/20 hover:text-white"
        >
          Volver a Eventos
        </Link>
      </aside>

      <div className="min-w-0 flex-1 [&_aside[data-admin-sidebar='true']]:hidden" key={pathname}>
        {children}
      </div>
    </div>
  );
}
