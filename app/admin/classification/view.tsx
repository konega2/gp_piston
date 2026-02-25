'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useActiveEvent } from '@/context/ActiveEventContext';

type ModuleKey = 'sessions' | 'times' | 'standings';

type ModuleConfig = {
  key: ModuleKey;
  number: string;
  title: string;
  subtitle: string;
  href: string;
  tone: 'deep-blue' | 'electric-blue' | 'technical-red';
  icon: React.ReactNode;
};

const modules: ModuleConfig[] = [
  {
    key: 'sessions',
    number: '01',
    title: 'SESIONES QUALY',
    subtitle: 'CONFIGURACIÓN OFICIAL DE GRUPOS Y BLOQUES',
    href: '/admin/classification/sessions',
    tone: 'deep-blue',
    icon: <SessionsIcon />
  },
  {
    key: 'times',
    number: '02',
    title: 'TIEMPOS QUALY',
    subtitle: 'CARGA Y VALIDACIÓN DE CRONOMETRAJE',
    href: '/admin/classification/times',
    tone: 'electric-blue',
    icon: <TimesIcon />
  },
  {
    key: 'standings',
    number: '03',
    title: 'CLASIFICACIÓN CONJUNTA',
    subtitle: 'RESULTADO FINAL UNIFICADO DEL EVENTO',
    href: '/admin/classification/standings',
    tone: 'technical-red',
    icon: <StandingsIcon />
  }
];

export default function ClassificationPage() {
  const { activeEventId } = useActiveEvent();
  const [hoveredModule, setHoveredModule] = useState<ModuleKey | null>(null);

  return (
    <main className="min-h-screen bg-gp-bg text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar activeItem="classification" />

        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(0,207,255,0.09),transparent_42%),radial-gradient(circle_at_85%_18%,rgba(225,6,0,0.08),transparent_40%),linear-gradient(to_bottom,#0A0F16,#0A0F16)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-size:11px_11px] [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />
          <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(to_bottom,rgba(184,194,212,0.1)_0,rgba(184,194,212,0.1)_1px,transparent_1px,transparent_42px)]" />

          <div className="relative z-10">
            <Header title="CLASSIFICATION" subtitle="Gestión operativa de clasificación oficial" />

            <section className="px-5 py-6 sm:px-6">
              <div className="mx-auto max-w-7xl space-y-5">
                <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">MÓDULO INTERNO</p>
                      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.14em] text-white">CLASSIFICATION</h1>
                    </div>

                    <Link
                      href={`/admin/events/${activeEventId}/dashboard`}
                      className="inline-flex items-center gap-2 rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition-colors duration-200 hover:bg-gp-telemetryBlue/20"
                    >
                      <span aria-hidden>←</span>
                      Volver a Dashboard
                    </Link>
                  </div>

                  <div className="mt-4 h-px w-full bg-gradient-to-r from-gp-racingRed/80 via-gp-telemetryBlue/55 to-transparent" />
                </article>

                <div className="grid min-h-[calc(100vh-300px)] grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {modules.map((item) => (
                    <Link
                      key={item.key}
                      href={item.href.replace('/admin', `/admin/events/${activeEventId}`)}
                      onMouseEnter={() => setHoveredModule(item.key)}
                      onMouseLeave={() => setHoveredModule(null)}
                      className={`group relative rounded-2xl border p-[1px] shadow-panel-deep transition-all duration-300 ${
                        hoveredModule && hoveredModule !== item.key ? 'scale-[0.99] opacity-65' : 'opacity-100'
                      } ${
                        item.tone === 'deep-blue'
                          ? 'border-gp-telemetryBlue/35'
                          : item.tone === 'electric-blue'
                            ? 'border-cyan-300/35'
                            : 'border-gp-racingRed/35'
                      } hover:scale-[1.02]`}
                    >
                      <article
                        className={`relative h-full min-h-[220px] overflow-hidden rounded-2xl border border-white/10 px-6 py-6 backdrop-blur-xl ${getToneBackground(item.tone)}`}
                      >
                        <span className="pointer-events-none absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(to_bottom,rgba(184,194,212,0.1)_0,rgba(184,194,212,0.1)_1px,transparent_1px,transparent_32px)]" />
                        <span className="pointer-events-none absolute left-4 top-4 h-4 w-4 border-l border-t border-gp-telemetryBlue/45" />
                        <span className="pointer-events-none absolute right-4 top-4 h-4 w-4 border-r border-t border-gp-racingRed/45" />
                        <span className="pointer-events-none absolute bottom-4 left-4 h-4 w-4 border-b border-l border-gp-racingRed/45" />
                        <span className="pointer-events-none absolute bottom-4 right-4 h-4 w-4 border-b border-r border-gp-telemetryBlue/45" />

                        <div className="relative flex h-full flex-col justify-between">
                          <p className="text-4xl font-semibold tracking-[0.16em] text-white/25">{item.number}</p>

                          <div className="my-6 flex flex-col items-center text-center">
                            <span className="mb-5 text-gp-textSoft transition-all duration-300 group-hover:scale-105 group-hover:text-white">{item.icon}</span>
                            <h2 className="text-2xl font-semibold uppercase tracking-[0.14em] text-white transition-all duration-300 group-hover:scale-[1.02] sm:text-3xl">
                              {item.title}
                            </h2>
                            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-gp-textSoft">{item.subtitle}</p>
                          </div>

                          <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/10">
                            <div className="h-full w-1/3 animate-telemetry-scan bg-gradient-to-r from-gp-racingRed via-gp-telemetryBlue to-transparent" />
                          </div>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function getToneBackground(tone: ModuleConfig['tone']) {
  if (tone === 'deep-blue') {
    return 'bg-[radial-gradient(circle_at_28%_38%,rgba(0,207,255,0.12),transparent_52%),linear-gradient(145deg,#0A1320_0%,#0C1725_100%)]';
  }

  if (tone === 'electric-blue') {
    return 'bg-[radial-gradient(circle_at_70%_32%,rgba(0,207,255,0.2),transparent_50%),linear-gradient(150deg,#0D1522_0%,#0D1D2D_100%)]';
  }

  return 'bg-[radial-gradient(circle_at_60%_35%,rgba(225,6,0,0.16),transparent_54%),linear-gradient(150deg,#161119_0%,#1B1218_100%)]';
}

function SessionsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

function TimesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13 16.5 9.5M12 5V3" />
    </svg>
  );
}

function StandingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M4 20h16" />
      <path d="M7 20V11h3v9M14 20V6h3v14" />
    </svg>
  );
}
