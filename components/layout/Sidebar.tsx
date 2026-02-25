import Link from 'next/link';

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin/dashboard',
    icon: <DashboardIcon />
  },
  {
    label: 'Eventos',
    href: '/admin/events',
    icon: <EventsIcon />
  },
  {
    label: 'Pilotos',
    href: '/admin/pilotos',
    icon: <PilotsIcon />
  },
  {
    label: 'Time Attack',
    href: '/admin/time-attack',
    icon: <TimeAttackIcon />
  },
  {
    label: 'Clasificación',
    href: '/admin/classification',
    icon: <ClassificationIcon />
  },
  {
    label: 'Equipos',
    href: '/admin/teams',
    icon: <TeamsIcon />
  },
  {
    label: 'Carreras',
    href: '/admin/races',
    icon: <RacesIcon />
  },
  {
    label: 'Resultados',
    href: '/admin/results',
    icon: <ResultsIcon />
  },
  {
    label: 'Estado del Evento',
    href: '/admin/event-status',
    icon: <EventStatusIcon />
  }
];

type SidebarProps = {
  activeItem?: 'dashboard' | 'events' | 'pilotos' | 'time-attack' | 'classification' | 'teams' | 'races' | 'results' | 'event-status';
};

export function Sidebar({ activeItem = 'dashboard' }: SidebarProps) {
  return (
    <aside data-admin-sidebar="true" className="w-full border-b border-white/10 bg-[#0E141F] px-4 py-5 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
      <div className="flex items-center justify-between lg:block">
        <div>
          <p className="text-xl font-semibold uppercase tracking-technical text-white">GP PISTÓN</p>
          <div className="mt-3 h-px w-36 bg-gradient-to-r from-gp-racingRed/90 to-transparent" />
        </div>
      </div>

      <nav className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:mt-8 lg:grid-cols-1 lg:gap-1.5">
        {navItems.map((item) => {
          const isActive =
            (activeItem === 'dashboard' && item.label === 'Dashboard') ||
            (activeItem === 'events' && item.label === 'Eventos') ||
            (activeItem === 'pilotos' && item.label === 'Pilotos') ||
            (activeItem === 'time-attack' && item.label === 'Time Attack') ||
            (activeItem === 'classification' && item.label === 'Clasificación') ||
            (activeItem === 'teams' && item.label === 'Equipos') ||
            (activeItem === 'races' && item.label === 'Carreras') ||
            (activeItem === 'results' && item.label === 'Resultados') ||
            (activeItem === 'event-status' && item.label === 'Estado del Evento');

          return (
          <Link
            key={item.label}
            href={item.href}
            className={`group relative flex items-center gap-3 rounded-lg border px-3 py-2.5 text-xs uppercase tracking-[0.14em] transition-all duration-200 ${
              isActive
                ? 'border-gp-racingRed/35 bg-white/[0.03] text-white'
                : 'border-white/10 text-gp-textSoft hover:border-gp-telemetryBlue/35 hover:bg-gp-telemetryBlue/[0.06] hover:text-white hover:shadow-[0_0_14px_rgba(0,207,255,0.14)]'
            }`}
          >
            {isActive ? <span className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-gp-racingRed" /> : null}
            <span className={`shrink-0 ${isActive ? 'text-gp-telemetryBlue' : 'text-gp-textSoft group-hover:text-gp-telemetryBlue'}`}>
              {item.icon}
            </span>
            <span className="truncate">{item.label}</span>
          </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

function EventsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 7h16M7 4v6M17 4v6" />
      <rect x="4" y="7" width="16" height="13" rx="2" />
      <path d="M8 12h3M13 12h3M8 16h3" />
    </svg>
  );
}

function PilotsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="7" r="3.2" />
      <path d="M4.5 21c0-3.6 3.3-6.5 7.5-6.5S19.5 17.4 19.5 21" />
    </svg>
  );
}

function TimeAttackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13 16 9M12 5V3" />
    </svg>
  );
}

function ClassificationIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 20h16" />
      <path d="M6 20V12h3v8M11 20V8h3v12M16 20V5h3v15" />
    </svg>
  );
}

function TeamsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="8" cy="8" r="2.5" />
      <circle cx="16" cy="8" r="2.5" />
      <path d="M3.5 20c0-2.9 2.2-5.2 5-5.2S13.5 17.1 13.5 20" />
      <path d="M10.5 20c0-2.9 2.2-5.2 5-5.2s5 2.3 5 5.2" />
    </svg>
  );
}

function RacesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 18h16" />
      <path d="M5 14h5l2-4h7" />
      <circle cx="7" cy="19" r="1.7" />
      <circle cx="17" cy="19" r="1.7" />
    </svg>
  );
}

function ResultsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 4h16v16H4z" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
}

function EventStatusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 4h16v16H4z" />
      <path d="M8 9h8M8 13h8M8 17h5" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

