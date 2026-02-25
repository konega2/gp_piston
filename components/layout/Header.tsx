import Link from 'next/link';

type HeaderProps = {
  title: string;
  subtitle?: string;
};

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-white/10 bg-[#101926]/85 px-5 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold uppercase tracking-[0.16em] text-white">{title}</h1>
        {subtitle ? <p className="mt-1 text-xs uppercase tracking-[0.12em] text-gp-textSoft">{subtitle}</p> : null}
      </div>

      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-gp-stateGreen/25 bg-gp-stateGreen/[0.08] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-green-300">
          <span className="h-2 w-2 rounded-full bg-gp-stateGreen shadow-[0_0_8px_rgba(0,255,133,0.7)]" />
          SISTEMA ACTIVO
        </span>

        <Link
          href="/admin/login"
          className="rounded-md border border-white/15 bg-white/[0.02] px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-gp-textSoft transition-all duration-200 hover:border-gp-racingRed/45 hover:bg-gp-racingRed/[0.08] hover:text-white"
        >
          Cerrar sesión
        </Link>
      </div>
    </header>
  );
}
