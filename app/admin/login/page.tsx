import { AdminLoginPanel } from '@/components/ui/admin-login-panel';

export default function AdminLoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(0,207,255,0.12),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(225,6,0,0.1),transparent_42%),linear-gradient(to_bottom,#0A0F16,#0A0F16)]" />

      <div className="pointer-events-none absolute inset-0 opacity-[0.09] [background-size:12px_12px] [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_6px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_6px)]" />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,207,255,0.08)_45%,transparent_100%)] opacity-40 animate-telemetry-glow" />

      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(to_bottom,rgba(184,194,212,0.12)_0,rgba(184,194,212,0.12)_1px,transparent_1px,transparent_42px)]" />

      <section className="relative z-10 w-full max-w-lg animate-fade-in">
        <header className="mb-10 text-center">
          <p className="text-3xl font-semibold uppercase tracking-technical text-white sm:text-4xl">GP PISTÓN</p>
          <p className="mt-2 text-xs uppercase tracking-[0.24em] text-gp-textSoft sm:text-sm">
            Sistema Oficial de Gestión del Campeonato
          </p>
          <div className="mx-auto mt-4 h-px w-40 bg-gradient-to-r from-transparent via-gp-racingRed to-transparent" />
        </header>

        <AdminLoginPanel />
      </section>
    </main>
  );
}
