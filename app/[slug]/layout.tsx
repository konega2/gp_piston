import type { ReactNode } from 'react';
import Image from 'next/image';
import logo from '../ChatGPT Image 2 mar 2026, 11_37_13.png';

type PublicSlugLayoutProps = { children: ReactNode };

export default function PublicSlugLayout({ children }: PublicSlugLayoutProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050A0F] text-white">

      {/* ── Fine technical grid ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* ── Diagonal speed-stripe (racing livery feel) ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute bg-[#E10600]/[0.03]"
          style={{
            width: '120%',
            height: '3px',
            top: '30%',
            left: '-10%',
            transform: 'rotate(-8deg)',
            boxShadow: '0 0 60px 20px rgba(225,6,0,0.04)',
          }}
        />
        <div
          className="absolute bg-[#E10600]/[0.02]"
          style={{
            width: '100%',
            height: '1px',
            top: '32%',
            left: '-5%',
            transform: 'rotate(-8deg)',
          }}
        />
      </div>

      {/* ── Deep red radial glow – behind the panel ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 65% 55% at 50% 52%, rgba(225,6,0,0.07) 0%, rgba(225,6,0,0.02) 40%, transparent 70%)',
        }}
      />

      {/* ── Top gradient accent line ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, #E10600 30%, #E10600 70%, transparent 100%)',
        }}
      />

      {/* ── Faint bottom glow ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
        style={{
          background: 'linear-gradient(to top, rgba(225,6,0,0.04) 0%, transparent 100%)',
        }}
      />

      {/* ── Main content column ── */}
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-[440px]">

          {/* Logo */}
          <div className="mb-3 flex justify-center">
            <Image
              src={logo}
              alt="GP Pistón"
              priority
              className="w-40 sm:w-44 opacity-95 drop-shadow-[0_0_24px_rgba(225,6,0,0.25)]"
            />
          </div>

          {/* Season tag */}
          <div className="mb-5 flex items-center justify-center gap-3">
            <div className="h-[1px] w-10 bg-gradient-to-r from-transparent to-[#E10600]/50" />
            <p className="text-[8px] font-mono font-bold uppercase tracking-[0.45em] text-[#E10600]/60">
              OFFICIAL DRIVER PORTAL
            </p>
            <div className="h-[1px] w-10 bg-gradient-to-l from-transparent to-[#E10600]/50" />
          </div>

          {/* HUD Panel */}
          <section
            className="relative overflow-hidden"
            style={{
              border: '1px solid #162030',
              backgroundColor: '#06101A',
              boxShadow:
                '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(225,6,0,0.06) inset',
            }}
          >
            {/* top accent */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[#E10600]"
            />

            {/* corner marks – top */}
            <div aria-hidden className="pointer-events-none absolute -top-px left-0 h-5 w-5 border-l-[2px] border-t-[2px] border-[#E10600]" />
            <div aria-hidden className="pointer-events-none absolute -top-px right-0 h-5 w-5 border-r-[2px] border-t-[2px] border-[#E10600]" />

            {/* corner marks – bottom */}
            <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 h-5 w-5 border-b border-l border-[#E10600]/30" />
            <div aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-5 w-5 border-b border-r border-[#E10600]/30" />

            {/* scanline overlay */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.025]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.8) 2px, rgba(255,255,255,0.8) 3px)',
                backgroundSize: '100% 3px',
              }}
            />

            {/* content */}
            <div className="relative px-6 py-7 sm:px-8 sm:py-8">{children}</div>
          </section>

          {/* System tag */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <div className="h-[1px] flex-1 bg-[#0E1A24]" />
            <span className="text-[7.5px] font-mono uppercase tracking-[0.4em] text-[#0E1A24]">
              GP PISTÓN · TIMING SYSTEM · {new Date().getFullYear()}
            </span>
            <div className="h-[1px] flex-1 bg-[#0E1A24]" />
          </div>

        </div>
      </div>
    </main>
  );
}
