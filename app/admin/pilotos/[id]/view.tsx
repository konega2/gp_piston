'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { PilotProfile } from '@/components/pilots/PilotProfile';
import { usePilots } from '@/context/PilotsContext';

export default function PilotDetailPage() {
  const params = useParams<{ id: string; eventId: string }>();
  const { pilots } = usePilots();

  const pilot = pilots.find((item) => item.id === params.id);

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
            <Header title="PILOTOS" subtitle="Ficha técnica de piloto" />

            <section className="px-5 py-6 sm:px-6">
              {pilot ? (
                <PilotProfile pilot={pilot} />
              ) : (
                <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.7)] p-8 text-center shadow-panel-deep backdrop-blur-xl">
                  <p className="text-xs uppercase tracking-[0.16em] text-gp-textSoft">Registro no encontrado</p>
                  <h1 className="mt-2 text-2xl font-semibold uppercase tracking-[0.14em] text-white">Piloto no disponible</h1>
                  <p className="mt-3 text-sm text-gp-textSoft">El identificador consultado no existe en el estado actual del campeonato.</p>
                  <Link
                    href={`/admin/events/${params.eventId}/pilotos/list`}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition-colors duration-200 hover:bg-gp-telemetryBlue/20"
                  >
                    <span aria-hidden>←</span>
                    Volver al listado
                  </Link>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
