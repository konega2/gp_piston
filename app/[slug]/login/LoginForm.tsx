'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';

type Props = {
  action: (formData: FormData) => void;
  errorMessage: string | null;
  eventName: string;
};

/* ─────────────────────────────────────────────
   Submit button — reads useFormStatus inside form
───────────────────────────────────────────── */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="group relative w-full overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
      style={{
        border: '1px solid #E10600',
        backgroundColor: 'transparent',
        padding: '13px 20px',
        transition: 'all 0.25s ease',
      }}
    >
      {/* fill sweep from left on hover */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-0 bg-[#E10600] transition-all duration-300 group-hover:w-full group-focus-visible:w-full"
        style={{ zIndex: 0 }}
      />
      <span
        className="relative z-10 flex items-center justify-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#E10600] transition-colors duration-300 group-hover:text-white"
      >
        {pending ? (
          <>
            <span className="inline-block h-[10px] w-[10px] animate-spin rounded-full border-[1.5px] border-[#E10600]/30 border-t-[#E10600]" />
            <span>VERIFYING CREDENTIALS</span>
          </>
        ) : (
          <>
            <span className="font-mono text-[12px]">&#9658;</span>
            <span>AUTHENTICATE DRIVER</span>
            <span className="font-mono text-[12px] opacity-40">&#9658;</span>
          </>
        )}
      </span>
    </button>
  );
}

/* ─────────────────────────────────────────────
   Small telemetry chip
───────────────────────────────────────────── */
function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[7px] font-bold uppercase tracking-[0.35em] text-[#1E3048]">{label}</span>
      <span className="font-mono text-[9px] font-semibold text-[#2E4A64]">{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main client form
───────────────────────────────────────────── */
export default function LoginForm({ action, errorMessage, eventName }: Props) {
  const [code, setCode] = useState('');
  const year = new Date().getFullYear();

  return (
    <div className="relative select-none">

      {/* ══════════════════════════════════
          RACE CHAMPIONSHIP HEADER
      ══════════════════════════════════ */}
      <div className="mb-6">
        {/* Season / Round strip */}
        <div className="mb-3 flex items-center justify-between">
          <div
            className="flex items-center gap-2 px-2.5 py-1"
            style={{ border: '1px solid #1A2E40', backgroundColor: '#050F18' }}
          >
            <span className="text-[7.5px] font-mono font-bold uppercase tracking-[0.35em] text-[#2E4A64]">
              SEASON
            </span>
            <span className="text-[11px] font-black text-[#E10600]">{year}</span>
          </div>
          <div
            className="flex items-center gap-2 px-2.5 py-1"
            style={{ border: '1px solid #1A2E40', backgroundColor: '#050F18' }}
          >
            <span className="text-[7.5px] font-mono font-bold uppercase tracking-[0.35em] text-[#2E4A64]">
              DRIVER ID
            </span>
            <span className="font-mono text-[11px] font-black text-[#4A90D9]">SYS</span>
          </div>
        </div>

        {/* Giant title */}
        <div className="relative py-2 text-center">
          {/* Background race number watermark */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center font-black text-[#E10600]"
            style={{ fontSize: '90px', opacity: 0.03, lineHeight: 1, userSelect: 'none' }}
          >
            01
          </span>
          <h1
            className="relative text-[28px] font-black uppercase leading-none tracking-[0.2em] text-white sm:text-[32px]"
            style={{ textShadow: '0 0 40px rgba(225,6,0,0.15)' }}
          >
            GP{' '}
            <span className="text-[#E10600]">PIST</span>
            <span className="text-white">ÓN</span>
          </h1>
          <div className="mt-1.5 flex items-center justify-center gap-2">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#E10600]/70" />
            <p className="text-[8.5px] font-mono font-bold uppercase tracking-[0.55em] text-[#E10600]/60">
              RACE CONTROL
            </p>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#E10600]/70" />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════
          ACTIVE CHAMPIONSHIP CHIP
      ══════════════════════════════════ */}
      <div
        className="mb-5 flex items-center justify-between gap-3"
        style={{
          border: '1px solid #162030',
          background: 'linear-gradient(135deg, #07121F 0%, #050D18 100%)',
          padding: '10px 14px',
        }}
      >
        <div className="min-w-0 flex-1">
          <p className="mb-0.5 text-[7.5px] font-mono uppercase tracking-[0.4em] text-[#1E3048]">
            ACTIVE CHAMPIONSHIP
          </p>
          <p className="truncate text-[12px] font-bold uppercase tracking-[0.06em] text-[#8BAEC4]">
            {eventName}
          </p>
        </div>
        {/* Animated LIVE badge */}
        <div
          className="flex shrink-0 items-center gap-2 px-3 py-1.5"
          style={{ border: '1px solid rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.06)' }}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22C55E]" />
          </span>
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-[#22C55E]">LIVE</span>
        </div>
      </div>

      {/* ══════════════════════════════════
          FORM
      ══════════════════════════════════ */}
      <form action={action} className="space-y-3.5">

        {/* Label */}
        <div className="flex items-center gap-2">
          <div className="h-[1px] w-3 bg-[#E10600]/50" />
          <label
            htmlFor="login_code"
            className="text-[8px] font-bold uppercase tracking-[0.45em] text-[#2E4A64]"
          >
            DRIVER ACCESS CODE
          </label>
          <div className="h-[1px] flex-1 bg-[#0E1E2E]" />
        </div>

        {/* Terminal input */}
        <div
          className="relative transition-all duration-200 focus-within:shadow-[0_0_0_1px_rgba(225,6,0,0.5)]"
          style={{ border: '1px solid #162030', backgroundColor: '#030810' }}
        >
          {/* > prefix */}
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <span
              className="font-mono text-[15px] font-bold leading-none text-[#E10600] animate-pulse"
              style={{ animationDuration: '1.4s' }}
            >
              &gt;
            </span>
          </div>
          <input
            id="login_code"
            name="login_code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="w-full bg-transparent py-4 pl-10 pr-12 font-mono text-[15px] font-bold tracking-[0.35em] text-white caret-[#E10600] placeholder:text-[#0E1E2E] placeholder:tracking-[0.25em] outline-none"
            required
          />
          {/* right vertical scan mark */}
          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
            <div
              className="h-4 w-[1px]"
              style={{ background: 'linear-gradient(to bottom, transparent, #E10600, transparent)' }}
            />
          </div>
        </div>

        {/* Error */}
        {errorMessage && (
          <div
            className="flex gap-3"
            style={{ border: '1px solid rgba(225,6,0,0.35)', backgroundColor: 'rgba(225,6,0,0.05)', padding: '10px 14px' }}
          >
            <div className="mt-0.5 shrink-0">
              <span
                className="flex h-4 w-4 items-center justify-center font-black text-[10px] text-[#E10600]"
                style={{ border: '1px solid rgba(225,6,0,0.6)' }}
              >
                !
              </span>
            </div>
            <div>
              <p className="text-[8.5px] font-black uppercase tracking-[0.35em] text-[#E10600] mb-1">
                AUTHENTICATION FAILED
              </p>
              <p className="text-[11px] text-[#F87171]/70">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Remember */}
        <label className="flex cursor-pointer items-center gap-3 py-1 text-[8.5px] uppercase tracking-[0.25em] text-[#1E3048] transition-colors hover:text-[#2E4A64] select-none">
          <span
            className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center"
            style={{ border: '1px solid #1A2E40', backgroundColor: '#030810' }}
          >
            <input
              name="remember"
              type="checkbox"
              className="peer absolute inset-0 cursor-pointer opacity-0"
            />
            <span className="pointer-events-none h-1.5 w-1.5 bg-[#E10600] opacity-0 peer-checked:opacity-100" />
          </span>
          Keep session alive on this device
        </label>

        {/* CTA */}
        <div className="pt-1">
          <SubmitButton />
        </div>

      </form>

      {/* ══════════════════════════════════
          TELEMETRY FOOTER
      ══════════════════════════════════ */}
      <div
        className="mt-6 flex items-center justify-between"
        style={{ borderTop: '1px solid #0E1E2E', paddingTop: '16px' }}
      >
        <Chip label="STATUS" value="ONLINE" />
        <div className="h-5 w-[1px] bg-[#0E1E2E]" />
        <Chip label="PROTOCOL" value="TLS-1.3" />
        <div className="h-5 w-[1px] bg-[#0E1E2E]" />
        <Chip label="BUILD" value="v2.5.0" />
        <div className="h-5 w-[1px] bg-[#0E1E2E]" />
        <Chip label="MODE" value="AUTH" />
      </div>

    </div>
  );
}

