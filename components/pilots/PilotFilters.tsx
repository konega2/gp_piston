import { PilotKart, PilotLevel } from '@/data/pilots';

type LevelFilter = PilotLevel | 'ALL';
type KartFilter = PilotKart | 'ALL';

type PilotFiltersProps = {
  searchTerm: string;
  levelFilter: LevelFilter;
  kartFilter: KartFilter;
  totalPilots: number;
  visiblePilots: number;
  maxPilots: number;
  onSearchChange: (value: string) => void;
  onLevelChange: (value: LevelFilter) => void;
  onKartChange: (value: KartFilter) => void;
};

export function PilotFilters({
  searchTerm,
  levelFilter,
  kartFilter,
  totalPilots,
  visiblePilots,
  maxPilots,
  onSearchChange,
  onLevelChange,
  onKartChange
}: PilotFiltersProps) {
  return (
    <section className="relative animate-fade-in rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.72)] p-4 shadow-panel-deep backdrop-blur-xl">
      <span className="pointer-events-none absolute left-3 top-3 h-4 w-4 border-l border-t border-gp-telemetryBlue/45" />
      <span className="pointer-events-none absolute right-3 top-3 h-4 w-4 border-r border-t border-gp-racingRed/45" />

      <div className="grid gap-3 xl:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[0.13em] text-gp-textSoft">Buscar por nombre</label>
          <input
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar piloto..."
            className="h-11 w-full rounded-lg border border-white/15 bg-[#0E141F] px-3 text-sm text-white outline-none transition-all duration-200 placeholder:text-gp-textSoft/60 focus:border-gp-racingRed/65 focus:shadow-input-red"
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[0.13em] text-gp-textSoft">Nivel</label>
          <select
            value={levelFilter}
            onChange={(event) => onLevelChange(event.target.value as LevelFilter)}
            className="h-11 w-full rounded-lg border border-white/15 bg-[#0E141F] px-3 text-sm text-white outline-none transition-all duration-200 focus:border-gp-racingRed/65 focus:shadow-input-red"
          >
            <option value="ALL">Todos</option>
            <option value="PRO">Pro</option>
            <option value="AMATEUR">Amateur</option>
            <option value="PRINCIPIANTE">Principiante</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[0.13em] text-gp-textSoft">Kart</label>
          <select
            value={kartFilter}
            onChange={(event) => onKartChange(event.target.value as KartFilter)}
            className="h-11 w-full rounded-lg border border-white/15 bg-[#0E141F] px-3 text-sm text-white outline-none transition-all duration-200 focus:border-gp-racingRed/65 focus:shadow-input-red"
          >
            <option value="ALL">Todos</option>
            <option value="270cc">270cc</option>
            <option value="390cc">390cc</option>
          </select>
        </div>

        <div className="flex items-end">
          <div className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.14em] text-gp-textSoft">Pilotos</p>
            <p className="mt-1 text-lg font-semibold tracking-[0.08em] text-white">
              {totalPilots} <span className="text-sm text-gp-textSoft">/ {maxPilots}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 h-px w-full bg-gradient-to-r from-gp-racingRed/70 via-gp-telemetryBlue/45 to-transparent" />
    </section>
  );
}
