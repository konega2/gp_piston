'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';

export default function EventsPage() {
  return (
    <main className="min-h-screen bg-gp-bg text-white">
      <div className="relative min-h-screen overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(0,207,255,0.09),transparent_42%),radial-gradient(circle_at_85%_18%,rgba(225,6,0,0.08),transparent_40%),linear-gradient(to_bottom,#0A0F16,#0A0F16)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-size:11px_11px] [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />

          <div className="relative z-10">
            <Header title="EVENTOS" subtitle="Gestión multi-evento del campeonato" />

            <section className="px-5 py-6 sm:px-6">
              <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
                <ModeCard
                  href="/admin/events/create"
                  title="CREAR EVENTO"
                  description="Configurar un nuevo evento con parámetros operativos completos."
                />
                <ModeCard
                  href="/admin/events/list"
                  title="VER EVENTOS"
                  description="Consultar eventos existentes y entrar al tablero de cada uno."
                />
              </div>
            </section>
          </div>
      </div>
    </main>
  );
}

function ModeCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-6 shadow-panel-deep backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-gp-telemetryBlue/40"
    >
      <span className="pointer-events-none absolute left-3 top-3 h-4 w-4 border-l border-t border-gp-telemetryBlue/45" />
      <span className="pointer-events-none absolute right-3 top-3 h-4 w-4 border-r border-t border-gp-racingRed/45" />
      <span className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 border-b border-l border-gp-racingRed/45" />
      <span className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 border-b border-r border-gp-telemetryBlue/45" />

      <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">MODO</p>
      <h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.14em] text-white">{title}</h2>
      <p className="mt-3 text-sm uppercase tracking-[0.08em] text-gp-textSoft">{description}</p>
    </Link>
  );
}
