'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PilotRecord } from '@/data/pilots';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { usePilots } from '@/context/PilotsContext';

type PilotProfileProps = {
  pilot: PilotRecord;
};

export function PilotProfile({ pilot }: PilotProfileProps) {
  const router = useRouter();
  const { activeEventId } = useActiveEvent();
  const { updatePilot, deletePilot } = usePilots();
  const [profileData, setProfileData] = useState<PilotRecord>(pilot);
  const [draftData, setDraftData] = useState<PilotRecord>(pilot);
  const [isEditMode, setIsEditMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [validationError, setValidationError] = useState('');

  const fullName = `${profileData.nombre} ${profileData.apellidos}`;
  const initials = useMemo(
    () => `${profileData.nombre.charAt(0)}${profileData.apellidos.charAt(0)}`.toUpperCase(),
    [profileData.apellidos, profileData.nombre]
  );

  const startEditMode = () => {
    setDraftData(profileData);
    setIsEditMode(true);
    setStatusMessage('');
    setValidationError('');
  };

  const cancelEditMode = () => {
    setDraftData(profileData);
    setIsEditMode(false);
    setStatusMessage('Edición cancelada. Registro restaurado.');
    setValidationError('');
  };

  const saveChanges = () => {
    setStatusMessage('');
    setValidationError('');

    const normalizedPhone = draftData.telefono.replace(/\D/g, '').slice(0, 9);
    const normalizedDraft: PilotRecord = {
      ...draftData,
      nombre: draftData.nombre.trim(),
      apellidos: draftData.apellidos.trim(),
      telefono: normalizedPhone,
      redesSociales: draftData.redesSociales.trim()
    };

    const draftError = validatePilotDraft(normalizedDraft);
    if (draftError) {
      setValidationError(draftError);
      return;
    }

    try {
      updatePilot(profileData.id, normalizedDraft);
      setProfileData(normalizedDraft);
      setDraftData(normalizedDraft);
      setIsEditMode(false);
      setStatusMessage('Cambios guardados correctamente.');
      console.log('GP PISTÓN | Cambios de piloto (mock):', normalizedDraft);
    } catch (error) {
      if (error instanceof Error && error.message) {
        setValidationError(error.message);
        return;
      }

      setValidationError('No se pudieron guardar los cambios del piloto.');
    }
  };

  const handleDeletePilot = () => {
    const confirmed = window.confirm('¿Eliminar este piloto del campeonato? Esta acción no se puede deshacer.');
    if (!confirmed) {
      return;
    }

    deletePilot(profileData.id);
    router.push(`/admin/events/${activeEventId}/pilotos/list`);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/events/${activeEventId}/pilotos/list`}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.02] px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-gp-textSoft transition-all duration-200 hover:border-gp-telemetryBlue/45 hover:bg-gp-telemetryBlue/[0.08] hover:text-white"
        >
          <span aria-hidden>←</span>
          Volver a listado
        </Link>

        {!isEditMode ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startEditMode}
              className="rounded-lg border border-gp-racingRed/45 bg-gp-racingRed/[0.1] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-red-200 transition-all duration-200 hover:bg-gp-racingRed/[0.2] hover:text-white"
            >
              EDITAR PILOTO
            </button>
            <button
              type="button"
              onClick={handleDeletePilot}
              className="rounded-lg border border-red-500/45 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-red-200 transition-all duration-200 hover:bg-red-500/20 hover:text-white"
            >
              ELIMINAR PILOTO
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveChanges}
              className="rounded-lg border border-gp-racingRed/60 bg-gp-racingRed/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-all duration-200 hover:shadow-[0_0_18px_rgba(225,6,0,0.35)]"
            >
              GUARDAR CAMBIOS
            </button>
            <button
              type="button"
              onClick={cancelEditMode}
              className="rounded-lg border border-white/20 bg-white/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-gp-textSoft transition-all duration-200 hover:border-white/35 hover:text-white"
            >
              CANCELAR
            </button>
          </div>
        )}
      </div>

      {isEditMode ? (
        <div className="rounded-xl border border-gp-racingRed/55 bg-gp-racingRed/[0.12] px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-red-100">
          MODO EDICIÓN ACTIVO
        </div>
      ) : null}

      {statusMessage ? (
        <div className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-gp-textSoft">{statusMessage}</div>
      ) : null}

      {validationError ? (
        <div className="rounded-xl border border-gp-racingRed/45 bg-gp-racingRed/10 px-4 py-3 text-sm text-red-200">{validationError}</div>
      ) : null}

      <section
        className={`relative rounded-2xl border p-4 shadow-panel-deep backdrop-blur-xl transition-all duration-200 sm:p-5 ${
          isEditMode
            ? 'border-gp-racingRed/35 bg-[rgba(24,19,24,0.72)] hover:border-gp-racingRed/50'
            : 'border-white/10 bg-[rgba(17,24,38,0.72)] hover:border-gp-racingRed/35'
        }`}
      >
        <span className="pointer-events-none absolute left-3 top-3 h-4 w-4 border-l border-t border-gp-telemetryBlue/45" />
        <span className="pointer-events-none absolute right-3 top-3 h-4 w-4 border-r border-t border-gp-racingRed/45" />

        <div className="grid gap-4 md:grid-cols-[220px_1fr_240px]">
          <div className="aspect-[4/5] overflow-hidden rounded-xl border border-white/10 bg-[#0E141F]">
            {profileData.foto ? (
              <img src={profileData.foto} alt={fullName} className="h-full w-full object-cover" />
            ) : (
              <div className="relative flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_25%_25%,rgba(0,207,255,0.09),transparent_50%),linear-gradient(to_bottom,#0E141F,#111826)]">
                <div className="absolute inset-0 opacity-25 [background-image:repeating-linear-gradient(to_bottom,rgba(184,194,212,0.12)_0,rgba(184,194,212,0.12)_1px,transparent_1px,transparent_18px)]" />
                <span className="relative text-4xl font-semibold uppercase tracking-[0.18em] text-gp-textSoft">{initials}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.14em] text-gp-textSoft">Ficha oficial del campeonato</p>

            {isEditMode ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <TechnicalInput
                  label="Nombre"
                  value={draftData.nombre}
                  onChange={(value) => setDraftData((prev) => ({ ...prev, nombre: value }))}
                />
                <TechnicalInput
                  label="Apellidos"
                  value={draftData.apellidos}
                  onChange={(value) => setDraftData((prev) => ({ ...prev, apellidos: value }))}
                />
                <TechnicalInput
                  label="Foto URL"
                  value={draftData.foto ?? ''}
                  onChange={(value) => setDraftData((prev) => ({ ...prev, foto: value.trim() ? value : null }))}
                  className="sm:col-span-2"
                />
              </div>
            ) : (
              <h1 className="text-3xl font-semibold uppercase tracking-[0.1em] text-white sm:text-4xl">{fullName}</h1>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {isEditMode ? (
                <TechnicalInput
                  label="Nº Piloto"
                  type="number"
                  value={String(draftData.numeroPiloto)}
                  onChange={(value) =>
                    setDraftData((prev) => ({ ...prev, numeroPiloto: Number(value) > 0 ? Number(value) : 1 }))
                  }
                  className="max-w-[145px]"
                />
              ) : (
                <span className="rounded-md border border-white/15 bg-black/45 px-3 py-1.5 text-lg font-semibold tracking-[0.14em] text-white">
                  #{String(profileData.numeroPiloto).padStart(2, '0')}
                </span>
              )}

              <SelectorChips
                label="Nivel"
                activeValue={isEditMode ? draftData.nivel : profileData.nivel}
                values={['PRO', 'AMATEUR', 'PRINCIPIANTE']}
                isEditMode={isEditMode}
                onChange={(value) => setDraftData((prev) => ({ ...prev, nivel: value as PilotRecord['nivel'] }))}
              />

              <SelectorChips
                label="Kart"
                activeValue={isEditMode ? draftData.kart : profileData.kart}
                values={['270cc', '390cc']}
                isEditMode={isEditMode}
                onChange={(value) => setDraftData((prev) => ({ ...prev, kart: value as PilotRecord['kart'] }))}
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-gp-textSoft">Estado interno</p>
            <div className="mt-3 space-y-2">
              <p className="text-xs uppercase tracking-[0.12em] text-gp-textSoft">Comisario/a</p>

              {isEditMode ? (
                <BinarySelector
                  value={draftData.comisario}
                  onChange={(value) => setDraftData((prev) => ({ ...prev, comisario: value }))}
                />
              ) : (
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${
                    profileData.comisario
                      ? 'border-gp-stateGreen/45 bg-gp-stateGreen/10 text-green-300'
                      : 'border-white/20 bg-white/[0.04] text-gp-textSoft'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${profileData.comisario ? 'bg-gp-stateGreen shadow-[0_0_8px_rgba(0,255,133,0.7)]' : 'bg-gp-textSoft/50'}`}
                  />
                  {profileData.comisario ? 'SI' : 'NO'}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <InfoPanel title="INFORMACIÓN PERSONAL" editMode={isEditMode}>
          <InfoItem
            label="Edad"
            value={`${profileData.edad} años`}
            editMode={isEditMode}
            inputType="number"
            inputValue={String(draftData.edad)}
            min={18}
            max={80}
            onInputChange={(value) =>
              setDraftData((prev) => ({ ...prev, edad: Number(value) > 0 ? Math.floor(Number(value)) : 0 }))
            }
          />
          <InfoItem
            label="Teléfono"
            value={profileData.telefono}
            editMode={isEditMode}
            inputValue={draftData.telefono}
            minLength={9}
            maxLength={9}
            pattern="[0-9]{9}"
            inputMode="numeric"
            onInputChange={(value) => setDraftData((prev) => ({ ...prev, telefono: value.replace(/\D/g, '').slice(0, 9) }))}
          />
          <InfoItem
            label="Redes sociales"
            value={profileData.redesSociales || 'No registrado'}
            editMode={isEditMode}
            inputValue={draftData.redesSociales}
            onInputChange={(value) => setDraftData((prev) => ({ ...prev, redesSociales: value }))}
          />
          <InfoItem
            label="Peso"
            value={profileData.peso ? `${profileData.peso} kg` : 'No registrado'}
            editMode={isEditMode}
            inputType="number"
            inputValue={draftData.peso === null ? '' : String(draftData.peso)}
            min={40}
            max={150}
            step={0.1}
            onInputChange={(value) => setDraftData((prev) => ({ ...prev, peso: value.trim() === '' ? null : Number(value) }))}
          />
        </InfoPanel>

        <InfoPanel title="PARTICIPACIÓN TIME ATTACK" editMode={isEditMode}>
          <InfoItem label="Time Attack contratado" value={profileData.hasTimeAttack ? 'SI' : 'NO'} editMode={false} />

          <div className="mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <span className="text-xs uppercase tracking-[0.12em] text-gp-textSoft">Estado comercial</span>
            {isEditMode ? (
              <BinarySelector
                value={draftData.hasTimeAttack}
                onChange={(value) => setDraftData((prev) => ({ ...prev, hasTimeAttack: value }))}
              />
            ) : (
              <span
                className={`rounded-md border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.13em] ${
                  profileData.hasTimeAttack
                    ? 'border-gp-telemetryBlue/55 bg-gp-telemetryBlue/10 text-cyan-200'
                    : 'border-white/20 bg-white/[0.04] text-gp-textSoft'
                }`}
              >
                {profileData.hasTimeAttack ? 'ACTIVO' : 'NO CONTRATADO'}
              </span>
            )}
          </div>
        </InfoPanel>
      </div>
    </div>
  );
}

type InfoPanelProps = {
  title: string;
  children: React.ReactNode;
  editMode?: boolean;
};

function InfoPanel({ title, children, editMode = false }: InfoPanelProps) {
  return (
    <section
      className={`relative rounded-2xl border p-5 shadow-panel-deep backdrop-blur-xl transition-all duration-200 ${
        editMode
          ? 'border-gp-racingRed/35 bg-[rgba(24,19,24,0.72)] hover:border-gp-racingRed/55'
          : 'border-white/10 bg-[rgba(17,24,38,0.72)] hover:border-gp-racingRed/35'
      }`}
    >
      <span className="pointer-events-none absolute left-3 top-3 h-4 w-4 border-l border-t border-gp-telemetryBlue/45" />
      <span className="pointer-events-none absolute right-3 top-3 h-4 w-4 border-r border-t border-gp-racingRed/45" />

      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white">{title}</p>
      <div className="mt-2 h-px w-full bg-gradient-to-r from-gp-racingRed/75 via-gp-telemetryBlue/45 to-transparent" />
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

type InfoItemProps = {
  label: string;
  value: string;
  editMode: boolean;
  inputValue?: string;
  inputType?: 'text' | 'number';
  onInputChange?: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  inputMode?: 'text' | 'numeric' | 'decimal';
};

function InfoItem({
  label,
  value,
  editMode,
  inputValue = '',
  inputType = 'text',
  onInputChange,
  min,
  max,
  step,
  minLength,
  maxLength,
  pattern,
  inputMode
}: InfoItemProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
      <span className="text-xs uppercase tracking-[0.12em] text-gp-textSoft">{label}</span>
      {editMode && onInputChange ? (
        <input
          type={inputType}
          min={min}
          max={max}
          step={step}
          minLength={minLength}
          maxLength={maxLength}
          pattern={pattern}
          inputMode={inputMode}
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          className="h-8 w-40 rounded-md border border-white/15 bg-[#0E141F] px-2 text-right text-sm text-white outline-none transition-all duration-200 focus:border-gp-racingRed/65 focus:shadow-input-red"
        />
      ) : (
        <span className="text-sm font-medium text-white">{value}</span>
      )}
    </div>
  );
}

type SelectorChipsProps = {
  label: string;
  activeValue: string;
  values: string[];
  isEditMode: boolean;
  onChange: (value: string) => void;
};

function SelectorChips({ label, activeValue, values, isEditMode, onChange }: SelectorChipsProps) {
  if (!isEditMode) {
    return (
      <span className="rounded-md border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.13em] text-white">
        {label} {activeValue}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.03] p-1">
      {values.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`rounded-md px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.13em] transition-all duration-200 ${
            activeValue === value
              ? 'bg-gp-racingRed/80 text-white'
              : 'text-gp-textSoft hover:bg-white/10 hover:text-white'
          }`}
        >
          {value}
        </button>
      ))}
    </div>
  );
}

type BinarySelectorProps = {
  value: boolean;
  onChange: (value: boolean) => void;
};

function BinarySelector({ value, onChange }: BinarySelectorProps) {
  return (
    <div className="inline-flex rounded-lg border border-white/15 bg-white/[0.03] p-1">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`rounded-md px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-200 ${
          value ? 'bg-gp-racingRed/80 text-white' : 'text-gp-textSoft hover:text-white'
        }`}
      >
        SI
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`rounded-md px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-200 ${
          !value ? 'bg-gp-racingRed/80 text-white' : 'text-gp-textSoft hover:text-white'
        }`}
      >
        NO
      </button>
    </div>
  );
}

type TechnicalInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
  className?: string;
  min?: number;
  max?: number;
  step?: number;
};

function TechnicalInput({ label, value, onChange, type = 'text', className = '', min, max, step }: TechnicalInputProps) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-[11px] uppercase tracking-[0.13em] text-gp-textSoft">{label}</span>
      <input
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-white/15 bg-[#0E141F] px-3 text-sm text-white outline-none transition-all duration-200 focus:border-gp-racingRed/65 focus:shadow-input-red"
      />
    </label>
  );
}

function validatePilotDraft(pilot: PilotRecord): string | null {
  if (pilot.nombre.trim().length === 0) {
    return 'El nombre es obligatorio.';
  }

  if (pilot.apellidos.trim().length === 0) {
    return 'Los apellidos son obligatorios.';
  }

  if (!Number.isInteger(pilot.edad) || pilot.edad < 18 || pilot.edad > 80) {
    return 'La edad debe ser un número entero entre 18 y 80.';
  }

  if (!/^\d{9}$/.test(pilot.telefono.trim())) {
    return 'El teléfono debe tener exactamente 9 dígitos numéricos.';
  }

  if (pilot.peso !== null) {
    if (!Number.isFinite(pilot.peso) || pilot.peso < 40 || pilot.peso > 150) {
      return 'El peso debe estar entre 40 y 150 kg.';
    }
  }

  return null;
}
