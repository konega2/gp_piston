'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useActiveEvent } from '@/context/ActiveEventContext';

type ModuleKey = 'editor' | 'standings';

type ModuleConfig = {
  key: ModuleKey;
  number: string;
  title: string;
  subtitle: string;
  href: string;
  tone: 'technical-red' | 'deep-blue';
  icon: React.ReactNode;
};

const modules: ModuleConfig[] = [
  {
    key: 'editor',
    number: '01',
    title: 'INTRODUCIR RESULTADOS',
    subtitle: 'CARGA DE POSICIONES FINALES Y CÁLCULO INTERNO',
    href: '/admin/results/editor',
    tone: 'technical-red',
    icon: <EditorIcon />
  },
  {
    key: 'standings',
    number: '02',
    title: 'VER RESULTADOS OFICIALES',
    subtitle: 'TABLAS FINALES INDIVIDUALES Y POR EQUIPOS',
    href: '/admin/results/standings',
    tone: 'deep-blue',
    icon: <StandingsIcon />
  }
];

export default function ResultsModePage() {
  const { activeEventId } = useActiveEvent();
  const [hoveredModule, setHoveredModule] = useState<ModuleKey | null>(null);

  return (
    <main className="min-h-screen bg-gp-bg text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar activeItem="results" />

        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(0,207,255,0.09),transparent_42%),radial-gradient(circle_at_85%_18%,rgba(225,6,0,0.08),transparent_40%),linear-gradient(to_bottom,#0A0F16,#0A0F16)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-size:11px_11px] [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />
          <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(to_bottom,rgba(184,194,212,0.1)_0,rgba(184,194,212,0.1)_1px,transparent_1px,transparent_42px)]" />

          <div className="relative z-10">
            <Header title="RESULTS" subtitle="Centro de control oficial de resultados" />

            <section className="px-5 py-6 sm:px-6">
              <div className="mx-auto max-w-7xl space-y-5">
                <article className="rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-5 shadow-panel-deep backdrop-blur-xl">
                  <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">SELECCIÓN DE MODO</p>
                  <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.14em] text-white">RESULTS OPERATIONS</h1>
                  <p className="mt-2 text-sm text-gp-textSoft">Selecciona el modo de trabajo para introducir o revisar resultados oficiales.</p>
                  <div className="mt-4 h-px w-full bg-gradient-to-r from-gp-racingRed/80 via-gp-telemetryBlue/55 to-transparent" />
                </article>

                <div className="grid min-h-[calc(100vh-320px)] grid-cols-1 gap-4 md:grid-cols-2">
                  {modules.map((item) => (
                    <Link
                      key={item.key}
                      href={item.href.replace('/admin', `/admin/events/${activeEventId}`)}
                      onMouseEnter={() => setHoveredModule(item.key)}
                      onMouseLeave={() => setHoveredModule(null)}
                      className={`group relative rounded-2xl border p-[1px] shadow-panel-deep transition-all duration-300 ${
                        hoveredModule && hoveredModule !== item.key ? 'scale-[0.99] opacity-65' : 'opacity-100'
                      } ${
                        item.tone === 'technical-red' ? 'border-gp-racingRed/35' : 'border-gp-telemetryBlue/35'
                      } hover:scale-[1.02]`}
                    >
                      <article
                        className={`relative h-full min-h-[260px] overflow-hidden rounded-2xl border border-white/10 px-6 py-6 backdrop-blur-xl ${
                          item.tone === 'technical-red'
                            ? 'bg-[radial-gradient(circle_at_60%_35%,rgba(225,6,0,0.16),transparent_54%),linear-gradient(150deg,#161119_0%,#1B1218_100%)]'
                            : 'bg-[radial-gradient(circle_at_28%_38%,rgba(0,207,255,0.12),transparent_52%),linear-gradient(145deg,#0A1320_0%,#0C1725_100%)]'
                        }`}
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

function EditorIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M4 20h16" />
      <path d="M7 16V6h10v10" />
      <path d="m10 10 2 2 4-4" />
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
