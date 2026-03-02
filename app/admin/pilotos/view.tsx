'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useActiveEvent } from '@/context/ActiveEventContext';

type ModeKey = 'list' | 'create';

export default function AdminPilotsPage() {
  const router = useRouter();
  const { activeEventId } = useActiveEvent();
  const [hoveredMode, setHoveredMode] = useState<ModeKey | null>(null);
  const [selectedMode, setSelectedMode] = useState<ModeKey | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  const handleEnterMode = (mode: ModeKey, route: string) => {
    if (isLeaving) {
      return;
    }

    setSelectedMode(mode);
    setIsLeaving(true);

    window.setTimeout(() => {
      router.push(route);
    }, 250);
  };

  return (
    <main className="min-h-screen bg-gp-bg text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar activeItem="pilotos" />

        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(0,207,255,0.08),transparent_42%),radial-gradient(circle_at_85%_18%,rgba(225,6,0,0.08),transparent_40%),linear-gradient(to_bottom,#0A0F16,#0A0F16)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-size:11px_11px] [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />
          <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(to_bottom,rgba(184,194,212,0.1)_0,rgba(184,194,212,0.1)_1px,transparent_1px,transparent_44px)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_48%,rgba(0,207,255,0.12),transparent_50%),radial-gradient(circle_at_72%_48%,rgba(225,6,0,0.12),transparent_52%)] opacity-70 animate-telemetry-glow" />

          <div className={`relative z-10 transition-opacity duration-300 ${isLeaving ? 'opacity-70' : 'opacity-100'}`}>
            <Header title="PILOTOS" subtitle="Gestión de participantes del campeonato" />

            <section className="px-5 pb-6 pt-5 sm:px-6">
              <div className="mx-auto flex min-h-[calc(100vh-180px)] max-w-7xl flex-col gap-4 lg:flex-row lg:gap-0">
                <ModePanel
                  mode="list"
                  index="01"
                  title="VER PILOTOS"
                  subtitle="CONSULTAR ESTADO DE PARTICIPANTES"
                  route={`/admin/events/${activeEventId}/pilotos/list`}
                  icon={<ListIcon />}
                  colorScheme="blue"
                  hoveredMode={hoveredMode}
                  selectedMode={selectedMode}
                  isLeaving={isLeaving}
                  onHover={setHoveredMode}
                  onEnterMode={handleEnterMode}
                />

                <ModePanel
                  mode="create"
                  index="02"
                  title="CREAR PILOTO"
                  subtitle="ALTA TÉCNICA DE NUEVO PARTICIPANTE"
                  route={`/admin/events/${activeEventId}/pilotos/create`}
                  icon={<CreateIcon />}
                  colorScheme="red"
                  hoveredMode={hoveredMode}
                  selectedMode={selectedMode}
                  isLeaving={isLeaving}
                  onHover={setHoveredMode}
                  onEnterMode={handleEnterMode}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

type ModePanelProps = {
  mode: ModeKey;
  index: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  route: string;
  colorScheme: 'blue' | 'red';
  hoveredMode: ModeKey | null;
  selectedMode: ModeKey | null;
  isLeaving: boolean;
  onHover: (mode: ModeKey | null) => void;
  onEnterMode: (mode: ModeKey, route: string) => void;
};

function ModePanel({
  mode,
  index,
  title,
  subtitle,
  icon,
  route,
  colorScheme,
  hoveredMode,
  selectedMode,
  isLeaving,
  onHover,
  onEnterMode
}: ModePanelProps) {
  const isHovered = hoveredMode === mode;
  const isOtherHovered = hoveredMode !== null && hoveredMode !== mode;
  const isSelected = selectedMode === mode;

  const baseTone =
    colorScheme === 'blue'
      ? 'bg-[radial-gradient(circle_at_30%_40%,rgba(0,207,255,0.2),transparent_55%),linear-gradient(140deg,#0B1524_0%,#0A1220_100%)]'
      : 'bg-[radial-gradient(circle_at_70%_40%,rgba(225,6,0,0.2),transparent_55%),linear-gradient(220deg,#1A1014_0%,#120E16_100%)]';

  const borderTone = colorScheme === 'blue' ? 'border-gp-telemetryBlue/35' : 'border-gp-racingRed/35';

  return (
    <button
      type="button"
      onMouseEnter={() => onHover(mode)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(mode)}
      onBlur={() => onHover(null)}
      onClick={() => onEnterMode(mode, route)}
      disabled={isLeaving}
      className={`group relative min-h-[250px] overflow-hidden rounded-2xl border text-left shadow-panel-deep transition-all duration-300 lg:min-h-full ${baseTone} ${borderTone} ${
        isLeaving
          ? isSelected
            ? 'scale-[1.02] opacity-100'
            : 'scale-[0.98] opacity-25'
          : isHovered
            ? 'lg:flex-[1.08] opacity-100 shadow-[0_24px_58px_rgba(0,0,0,0.62),0_0_22px_rgba(225,6,0,0.18)]'
            : isOtherHovered
              ? 'lg:flex-[0.92] opacity-70'
              : 'lg:flex-1 opacity-100'
      }`}
    >
      <span className="pointer-events-none absolute inset-0 opacity-25 [background-image:repeating-linear-gradient(to_bottom,rgba(184,194,212,0.11)_0,rgba(184,194,212,0.11)_1px,transparent_1px,transparent_34px)]" />
      <span className="pointer-events-none absolute inset-0 opacity-[0.08] [background-size:10px_10px] [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_6px)]" />

      <span className="relative flex h-full min-h-[250px] flex-col justify-between px-6 py-6 sm:px-8 lg:min-h-[calc(100vh-200px)]">
        <span className="pointer-events-none absolute left-4 top-4 h-4 w-4 border-l border-t border-gp-telemetryBlue/45" />
        <span className="pointer-events-none absolute right-4 top-4 h-4 w-4 border-r border-t border-gp-racingRed/45" />
        <span className="pointer-events-none absolute bottom-4 left-4 h-4 w-4 border-b border-l border-gp-racingRed/45" />
        <span className="pointer-events-none absolute bottom-4 right-4 h-4 w-4 border-b border-r border-gp-telemetryBlue/45" />

        <span className="text-right text-4xl font-semibold uppercase leading-none tracking-[0.16em] text-white/25">{index}</span>

        <span className="my-6 flex flex-1 flex-col items-center justify-center text-center">
          <span className={`mb-6 text-gp-textSoft transition-all duration-300 ${isHovered ? 'scale-110 text-white' : 'scale-100'}`}>
            {icon}
          </span>

          <span
            className={`block text-4xl font-semibold uppercase leading-tight tracking-[0.14em] text-white transition-all duration-300 sm:text-5xl ${
              isHovered ? 'scale-[1.03]' : 'scale-100'
            }`}
          >
            {title}
          </span>
          <span className="mt-3 block text-xs uppercase tracking-[0.18em] text-gp-textSoft sm:text-sm">{subtitle}</span>
        </span>

        <span className="block h-[2px] w-full overflow-hidden rounded-full bg-white/10">
          <span className="block h-full w-1/3 animate-telemetry-scan bg-gradient-to-r from-gp-racingRed via-gp-telemetryBlue to-transparent" />
        </span>
      </span>
    </button>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-16 w-16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8h10M7 12h10M7 16h7" />
    </svg>
  );
}

function CreateIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-16 w-16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <circle cx="10" cy="8" r="3" />
      <path d="M4.5 20c0-3.2 2.7-5.8 6-5.8" />
      <path d="M16 8v8M12 12h8" />
    </svg>
  );
}
