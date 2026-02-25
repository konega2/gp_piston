'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateAdminCredentials } from '@/lib/auth/mock-admin-auth';

type Credentials = {
  user: string;
  password: string;
};

const initialCredentials: Credentials = {
  user: '',
  password: ''
};

export function AdminLoginPanel() {
  const router = useRouter();
  const [credentials, setCredentials] = useState<Credentials>(initialCredentials);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDisabled = useMemo(
    () => isSubmitting || credentials.user.length === 0 || credentials.password.length === 0,
    [credentials.password.length, credentials.user.length, isSubmitting]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    await new Promise((resolve) => setTimeout(resolve, 350));

    if (!validateAdminCredentials(credentials.user, credentials.password)) {
      setError('Credenciales inválidas. Verifica usuario y contraseña.');
      setIsSubmitting(false);
      return;
    }

    router.push('/admin/events');
  };

  return (
    <div className="relative rounded-2xl bg-card-border p-[1px] shadow-panel-deep">
      <div className="relative rounded-2xl border border-white/10 bg-[rgba(17,24,38,0.7)] p-6 backdrop-blur-xl sm:p-8">
        <CornerDetails />

        <p className="text-center text-sm font-medium uppercase tracking-[0.2em] text-white">ACCESO ADMINISTRADOR</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <InputRow
            label="Usuario"
            type="text"
            value={credentials.user}
            autoComplete="username"
            icon={<UserIcon />}
            onChange={(value) => setCredentials((prev) => ({ ...prev, user: value }))}
          />

          <InputRow
            label="Contraseña"
            type="password"
            value={credentials.password}
            autoComplete="current-password"
            icon={<LockIcon />}
            onChange={(value) => setCredentials((prev) => ({ ...prev, password: value }))}
          />

          {error ? (
            <div className="rounded-lg border border-gp-racingRed/45 bg-gp-racingRed/10 px-3 py-2 text-xs tracking-[0.06em] text-red-200" role="alert">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isDisabled}
            className="group relative mt-2 w-full overflow-hidden rounded-xl border border-gp-telemetryBlue/40 bg-gradient-to-r from-gp-racingRed/80 to-gp-telemetryBlue/80 px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition-all duration-200 hover:shadow-button-glow active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-200 group-hover:translate-x-full" />
            <span className="relative">{isSubmitting ? 'VALIDANDO...' : 'INICIAR SESIÓN'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

type InputRowProps = {
  label: string;
  type: 'text' | 'password';
  value: string;
  icon: React.ReactNode;
  autoComplete: string;
  onChange: (value: string) => void;
};

function InputRow({ label, type, value, icon, autoComplete, onChange }: InputRowProps) {
  return (
    <label className="group block">
      <span className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-gp-textSoft">{label}</span>
      <span className="flex items-center gap-3 rounded-xl border border-white/12 bg-[#0D141F] px-3 py-3 transition-all duration-200 group-focus-within:shadow-input-red group-hover:border-gp-racingRed/45 group-focus-within:border-gp-racingRed/70">
        <span className="text-gp-telemetryBlue">{icon}</span>
        <input
          type={type}
          value={value}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gp-textSoft/60"
          placeholder={`Ingrese ${label.toLowerCase()}`}
          required
        />
      </span>
    </label>
  );
}

function CornerDetails() {
  return (
    <>
      <span className="pointer-events-none absolute left-3 top-3 h-4 w-4 border-l border-t border-gp-telemetryBlue/45" />
      <span className="pointer-events-none absolute right-3 top-3 h-4 w-4 border-r border-t border-gp-racingRed/45" />
      <span className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 border-b border-l border-gp-racingRed/45" />
      <span className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 border-b border-r border-gp-telemetryBlue/45" />
    </>
  );
}

function UserIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M12 12c2.76 0 5-2.46 5-5.5S14.76 1 12 1 7 3.46 7 6.5 9.24 12 12 12Z" />
      <path d="M3 22c0-4.42 4.03-8 9-8s9 3.58 9 8" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
      <circle cx="12" cy="16" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}
