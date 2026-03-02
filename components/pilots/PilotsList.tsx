export function PilotsList() {
  return (
    <section className="relative max-w-4xl rounded-2xl bg-card-border p-[1px] shadow-panel-deep animate-fade-in">
      <div className="relative rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.7)] px-6 py-7 backdrop-blur-xl sm:px-8">
        <HudCorners />

        <p className="text-[11px] uppercase tracking-[0.16em] text-gp-textSoft">MÓDULO EN DESARROLLO</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[0.04em] text-white">Listado de pilotos próximamente</h2>
        <p className="mt-3 max-w-2xl text-sm text-gp-textSoft">
          Este bloque mostrará los participantes registrados, estado de licencia y métricas de rendimiento del campeonato.
        </p>

        <div className="mt-6 h-px w-full bg-gradient-to-r from-gp-racingRed/70 via-gp-telemetryBlue/45 to-transparent" />
      </div>
    </section>
  );
}

function HudCorners() {
  return (
    <>
      <span className="pointer-events-none absolute left-3 top-3 h-4 w-4 border-l border-t border-gp-telemetryBlue/45" />
      <span className="pointer-events-none absolute right-3 top-3 h-4 w-4 border-r border-t border-gp-racingRed/45" />
      <span className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 border-b border-l border-gp-racingRed/45" />
      <span className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 border-b border-r border-gp-telemetryBlue/45" />
    </>
  );
}
