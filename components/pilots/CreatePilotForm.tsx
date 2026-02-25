'use client';

import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { usePilots } from '@/context/PilotsContext';

type SkillLevel = 'pro' | 'amateur' | 'beginner' | null;
type KartType = '270cc' | '390cc' | null;

type PersonalInfo = {
  name: string;
  lastName: string;
  age: string;
  phone: string;
  social: string;
  weight: string;
};

const initialPersonalInfo: PersonalInfo = {
  name: '',
  lastName: '',
  age: '',
  phone: '',
  social: '',
  weight: ''
};

const PHONE_REGEX = /^\d{9}$/;

export function CreatePilotForm() {
  const router = useRouter();
  const { activeEventId } = useActiveEvent();
  const { addPilot } = usePilots();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>(initialPersonalInfo);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(null);
  const [hasTimeAttack, setHasTimeAttack] = useState<boolean | null>(null);
  const [kartType, setKartType] = useState<KartType>(null);
  const [isCommissionerAvailable, setIsCommissionerAvailable] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [photoFile]);

  const isSubmitDisabled = useMemo(() => {
    return (
      personalInfo.name.trim().length === 0 ||
      personalInfo.lastName.trim().length === 0 ||
      personalInfo.age.trim().length === 0 ||
      personalInfo.phone.trim().length === 0
    );
  }, [personalInfo.age, personalInfo.lastName, personalInfo.name, personalInfo.phone]);

  const updatePersonalInfo = (field: keyof PersonalInfo, value: string) => {
    if (field === 'phone') {
      const normalizedPhone = value.replace(/\D/g, '').slice(0, 9);
      setPersonalInfo((prev) => ({ ...prev, [field]: normalizedPhone }));
      return;
    }

    setPersonalInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoFromInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setValidationError('Solo se permiten imágenes para la foto del piloto.');
      return;
    }

    setValidationError('');
    setPhotoFile(file);
  };

  const handleDropPhoto = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setValidationError('Solo se permiten imágenes para la foto del piloto.');
      return;
    }

    setValidationError('');
    setPhotoFile(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedbackMessage('');
    setValidationError('');

    const personalInfoError = validatePersonalInfo(personalInfo);
    if (personalInfoError) {
      setValidationError(personalInfoError);
      return;
    }

    if (!skillLevel) {
      setValidationError('Selecciona el nivel de habilidad del piloto.');
      return;
    }

    if (!kartType) {
      setValidationError('Selecciona el tipo de kart para completar el registro.');
      return;
    }

    if (hasTimeAttack === null) {
      setValidationError('Indica si el piloto tiene Time Attack contratado.');
      return;
    }

    try {
      const parsedAge = Number(personalInfo.age);
      const parsedWeight = personalInfo.weight.trim() ? Number(personalInfo.weight) : null;
      const photoDataUrl = photoFile ? await fileToDataUrl(photoFile) : null;
      const createdPilot = addPilot({
        nombre: personalInfo.name.trim(),
        apellidos: personalInfo.lastName.trim(),
        edad: parsedAge,
        telefono: personalInfo.phone.trim(),
        redesSociales: personalInfo.social.trim(),
        peso: parsedWeight,
        nivel: skillLevelToLevel(skillLevel),
        hasTimeAttack,
        kart: kartType,
        comisario: isCommissionerAvailable,
        foto: photoDataUrl
      });

      console.log('GP PISTÓN | Registro de piloto (mock):', createdPilot);
      setFeedbackMessage(`Piloto #${String(createdPilot.numeroPiloto).padStart(2, '0')} registrado correctamente.`);
    } catch (error) {
      if (error instanceof Error && error.message === 'MAX_PILOTS_REACHED') {
        setValidationError('Se alcanzó el máximo de participantes para este evento.');
        return;
      }

      if (error instanceof Error && error.message) {
        setValidationError(error.message);
        return;
      }

      setValidationError('No se pudo procesar la imagen. Inténtalo nuevamente.');
      return;
    }

    window.setTimeout(() => {
      router.push(`/admin/events/${activeEventId}/pilotos`);
    }, 900);
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-5xl space-y-6 animate-fade-in">
      <FormSection title="INFORMACIÓN PERSONAL">
        <div className="grid gap-4 md:grid-cols-2">
          <TechnicalInput
            label="Nombre"
            required
            value={personalInfo.name}
            onChange={(value) => updatePersonalInfo('name', value)}
            placeholder="Nombre del piloto"
          />
          <TechnicalInput
            label="Apellidos"
            required
            value={personalInfo.lastName}
            onChange={(value) => updatePersonalInfo('lastName', value)}
            placeholder="Apellidos del piloto"
          />
          <TechnicalInput
            label="Edad"
            required
            type="number"
            min="18"
            max="80"
            value={personalInfo.age}
            onChange={(value) => updatePersonalInfo('age', value)}
            placeholder="Edad"
          />
          <TechnicalInput
            label="Teléfono"
            required
            value={personalInfo.phone}
            onChange={(value) => updatePersonalInfo('phone', value)}
            placeholder="600000000"
            pattern="\\d{9}"
            minLength={9}
            maxLength={9}
            inputMode="numeric"
          />
          <TechnicalInput
            label="Usuario en redes sociales"
            value={personalInfo.social}
            onChange={(value) => updatePersonalInfo('social', value)}
            placeholder="@usuario"
          />
          <TechnicalInput
            label="Peso"
            type="number"
            value={personalInfo.weight}
            onChange={(value) => updatePersonalInfo('weight', value)}
            placeholder="Kg"
            min="40"
            max="150"
            step="0.1"
          />
        </div>
      </FormSection>

      <FormSection title="NIVEL DE HABILIDAD">
        <div className="grid gap-4 md:grid-cols-3">
          <ChoiceCard
            title="GRUPO 1 – PRO"
            description="Asiduo en carreras de Karting"
            selected={skillLevel === 'pro'}
            onClick={() => setSkillLevel('pro')}
          />
          <ChoiceCard
            title="GRUPO 2 – AMATEUR"
            description="Participo ocasionalmente"
            selected={skillLevel === 'amateur'}
            onClick={() => setSkillLevel('amateur')}
          />
          <ChoiceCard
            title="GRUPO 3 – PRINCIPIANTE"
            description="Estoy empezando"
            selected={skillLevel === 'beginner'}
            onClick={() => setSkillLevel('beginner')}
          />
        </div>
      </FormSection>

      <FormSection title="PARTICIPACIÓN EN TIME ATTACK">
        <div className="space-y-4">
          <BinaryToggle
            label="¿Time Attack contratado?"
            value={hasTimeAttack}
            onChange={setHasTimeAttack}
          />
        </div>
      </FormSection>

      <FormSection title="ELECCIÓN DE KART">
        <div className="grid gap-4 md:grid-cols-2">
          <KartCard
            title="270cc"
            description="Respuesta estable, ideal para sesiones técnicas y consistencia de trazada."
            selected={kartType === '270cc'}
            onClick={() => setKartType('270cc')}
          />
          <KartCard
            title="390cc"
            description="Mayor entrega de potencia para pilotos con ritmo competitivo avanzado."
            selected={kartType === '390cc'}
            onClick={() => setKartType('390cc')}
          />
        </div>
      </FormSection>

      <FormSection title="DISPONIBILIDAD COMO COMISARIO/A">
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
          <p className="text-sm uppercase tracking-[0.13em] text-gp-textSoft">Disponible para funciones de comisario/a</p>
          <button
            type="button"
            onClick={() => setIsCommissionerAvailable((prev) => !prev)}
            className={`relative h-8 w-20 rounded-full border transition-all duration-200 ${
              isCommissionerAvailable
                ? 'border-gp-stateGreen/50 bg-gp-stateGreen/[0.2]'
                : 'border-white/20 bg-white/[0.06]'
            }`}
            aria-pressed={isCommissionerAvailable}
          >
            <span className="sr-only">Disponibilidad comisario</span>
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all duration-200 ${
                isCommissionerAvailable ? 'left-[50px]' : 'left-1'
              }`}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gp-bg">
              {isCommissionerAvailable ? 'SI' : 'NO'}
            </span>
          </button>
        </div>
      </FormSection>

      <FormSection title="FOTO DEL PILOTO (OPCIONAL)">
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDropPhoto}
            className={`relative flex min-h-40 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-7 text-center transition-all duration-200 ${
              isDragOver
                ? 'border-gp-telemetryBlue/70 bg-gp-telemetryBlue/[0.08]'
                : 'border-white/20 bg-white/[0.02] hover:border-gp-racingRed/60 hover:bg-gp-racingRed/[0.05]'
            }`}
          >
            <UploadIcon />
            <p className="mt-3 text-sm uppercase tracking-[0.14em] text-white">Arrastrar imagen o hacer click</p>
            <p className="mt-1 text-xs text-gp-textSoft">Formatos recomendados: JPG, PNG, WEBP</p>
          </button>

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoFromInput} className="hidden" />

          {photoPreview ? (
            <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
              <img src={photoPreview} alt="Preview del piloto" className="h-16 w-16 rounded-full object-cover ring-2 ring-gp-racingRed/40" />
              <div className="flex-1">
                <p className="text-sm text-white">{photoFile?.name}</p>
                <p className="text-xs uppercase tracking-[0.12em] text-gp-textSoft">Previsualización cargada</p>
              </div>
              <button
                type="button"
                onClick={() => setPhotoFile(null)}
                className="rounded-md border border-gp-racingRed/40 bg-gp-racingRed/[0.08] px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-red-200 transition-colors duration-200 hover:bg-gp-racingRed/[0.18]"
              >
                Eliminar
              </button>
            </div>
          ) : null}
        </div>
      </FormSection>

      {validationError ? (
        <div className="rounded-xl border border-gp-racingRed/45 bg-gp-racingRed/10 px-4 py-3 text-sm text-red-200">{validationError}</div>
      ) : null}

      {feedbackMessage ? (
        <div className="rounded-xl border border-gp-stateGreen/35 bg-gp-stateGreen/[0.1] px-4 py-3 text-sm text-green-200">{feedbackMessage}</div>
      ) : null}

      <div className="flex justify-center pt-2">
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="group relative w-full max-w-md overflow-hidden rounded-xl border border-gp-racingRed/55 bg-gradient-to-r from-gp-racingRed to-[#C10000] px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-all duration-200 hover:shadow-[0_0_28px_rgba(225,6,0,0.35)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-200 group-hover:translate-x-full" />
          <span className="relative">REGISTRAR PILOTO</span>
        </button>
      </div>
    </form>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Formato inválido'));
      }
    };
    reader.onerror = () => reject(new Error('Error leyendo archivo'));
    reader.readAsDataURL(file);
  });
}

function skillLevelToLevel(skillLevel: Exclude<SkillLevel, null>) {
  if (skillLevel === 'pro') {
    return 'PRO' as const;
  }

  if (skillLevel === 'amateur') {
    return 'AMATEUR' as const;
  }

  return 'PRINCIPIANTE' as const;
}

type FormSectionProps = {
  title: string;
  children: React.ReactNode;
};

function FormSection({ title, children }: FormSectionProps) {
  return (
    <section className="relative rounded-2xl border border-gp-racingRed/25 bg-[rgba(17,24,38,0.74)] px-5 py-6 shadow-panel-deep backdrop-blur-xl sm:px-6">
      <span className="pointer-events-none absolute left-3 top-3 h-4 w-4 border-l border-t border-gp-telemetryBlue/45" />
      <span className="pointer-events-none absolute right-3 top-3 h-4 w-4 border-r border-t border-gp-racingRed/45" />
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white">{title}</p>
      <div className="mt-2 h-px w-full bg-gradient-to-r from-gp-racingRed/80 via-gp-telemetryBlue/45 to-transparent" />
      <div className="mt-5">{children}</div>
    </section>
  );
}

type TechnicalInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: 'text' | 'number';
  min?: string;
  max?: string;
  step?: string;
  minLength?: number;
  maxLength?: number;
  inputMode?: 'text' | 'numeric' | 'decimal';
  pattern?: string;
};

function TechnicalInput({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = 'text',
  min,
  max,
  step,
  minLength,
  maxLength,
  inputMode,
  pattern
}: TechnicalInputProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.13em] text-gp-textSoft">
        {label} {required ? <span className="text-gp-racingRed">*</span> : null}
      </span>
      <input
        type={type}
        min={min}
        max={max}
        step={step}
        minLength={minLength}
        maxLength={maxLength}
        inputMode={inputMode}
        pattern={pattern}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-white/15 bg-[#0E141F] px-3 text-sm text-white outline-none transition-all duration-200 placeholder:text-gp-textSoft/55 focus:border-gp-racingRed/65 focus:shadow-input-red"
      />
    </label>
  );
}

function validatePersonalInfo(personalInfo: PersonalInfo): string | null {
  const missingFields: string[] = [];

  if (personalInfo.name.trim().length === 0) {
    missingFields.push('Nombre');
  }

  if (personalInfo.lastName.trim().length === 0) {
    missingFields.push('Apellidos');
  }

  if (personalInfo.age.trim().length === 0) {
    missingFields.push('Edad');
  }

  if (personalInfo.phone.trim().length === 0) {
    missingFields.push('Teléfono');
  }

  if (missingFields.length > 0) {
    return `Faltan campos obligatorios: ${missingFields.join(', ')}.`;
  }

  const age = Number(personalInfo.age);
  if (!Number.isInteger(age) || age < 18 || age > 80) {
    return 'La edad debe ser un número entero entre 18 y 80.';
  }

  const phone = personalInfo.phone.trim();
  if (!PHONE_REGEX.test(phone)) {
    return 'El teléfono debe tener exactamente 9 dígitos numéricos.';
  }

  if (personalInfo.weight.trim().length > 0) {
    const weight = Number(personalInfo.weight);
    if (!Number.isFinite(weight) || weight < 40 || weight > 150) {
      return 'El peso debe estar entre 40 y 150 kg.';
    }
  }

  return null;
}

type ChoiceCardProps = {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
};

function ChoiceCard({ title, description, selected, onClick }: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-xl border p-4 text-left transition-all duration-200 ${
        selected
          ? 'border-gp-racingRed/80 bg-gp-racingRed/[0.1] shadow-[0_0_18px_rgba(225,6,0,0.25)]'
          : 'border-white/15 bg-white/[0.02] hover:border-gp-telemetryBlue/45 hover:bg-gp-telemetryBlue/[0.08] hover:shadow-[0_0_16px_rgba(0,207,255,0.18)]'
      }`}
    >
      {selected ? (
        <span className="absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full border border-gp-racingRed/70 bg-gp-racingRed/20 text-[10px] text-white">
          ✓
        </span>
      ) : null}
      <p className="text-sm font-semibold uppercase tracking-[0.13em] text-white">{title}</p>
      <p className="mt-2 text-xs text-gp-textSoft">{description}</p>
    </button>
  );
}

type BinaryToggleProps = {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
};

function BinaryToggle({ label, value, onChange }: BinaryToggleProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm uppercase tracking-[0.13em] text-gp-textSoft">{label}</p>
      <div className="inline-flex rounded-lg border border-white/15 bg-white/[0.03] p-1">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-200 ${
            value === true ? 'bg-gp-racingRed/80 text-white' : 'text-gp-textSoft hover:text-white'
          }`}
        >
          SI
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-200 ${
            value === false ? 'bg-gp-racingRed/80 text-white' : 'text-gp-textSoft hover:text-white'
          }`}
        >
          NO
        </button>
      </div>
    </div>
  );
}

type KartCardProps = {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
};

function KartCard({ title, description, selected, onClick }: KartCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-5 text-left transition-all duration-200 ${
        selected
          ? 'border-gp-racingRed/80 bg-gp-racingRed/[0.1] shadow-[0_0_18px_rgba(225,6,0,0.25)]'
          : 'border-white/15 bg-white/[0.02] hover:border-gp-telemetryBlue/45 hover:bg-gp-telemetryBlue/[0.08]'
      }`}
    >
      <p className="text-2xl font-semibold uppercase tracking-[0.12em] text-white">{title}</p>
      <p className="mt-2 text-sm text-gp-textSoft">{description}</p>
    </button>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10 text-gp-telemetryBlue" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 16.5v1.5A2 2 0 0 0 6 20h12a2 2 0 0 0 2-2v-1.5" />
    </svg>
  );
}
