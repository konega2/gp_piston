'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { PilotRecord } from '@/data/pilots';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { loadModuleState, saveModuleState } from '@/lib/eventStateClient';
import { useEventRuntimeConfig } from '@/lib/event-client';

type NewPilotInput = Omit<PilotRecord, 'id' | 'numeroPiloto' | 'loginCode'> & {
  id?: string;
  loginCode?: string;
};

const PHONE_REGEX = /^\d{9}$/;

type LegacyPilotRecord = Omit<PilotRecord, 'hasTimeAttack' | 'loginCode'> & {
  hasTimeAttack?: boolean;
  loginCode?: string;
  tandas?: string[];
};

type PilotsContextValue = {
  pilots: PilotRecord[];
  isHydrated: boolean;
  addPilot: (pilot: NewPilotInput) => PilotRecord;
  updatePilot: (id: string, updatedPilot: PilotRecord) => void;
  deletePilot: (id: string) => void;
};

const PilotsContext = createContext<PilotsContextValue | null>(null);

export function PilotsProvider({ children }: { children: React.ReactNode }) {
  const { activeEventId, isHydrated: activeEventHydrated } = useActiveEvent();
  const runtimeConfig = useEventRuntimeConfig(activeEventId);
  const [pilots, setPilots] = useState<PilotRecord[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const maxPilots = runtimeConfig?.maxPilots ?? 0;

  useEffect(() => {
    if (!activeEventHydrated || !runtimeConfig) {
      return;
    }

    setIsHydrated(false);

    void (async () => {
      try {
        const stored = await loadModuleState<LegacyPilotRecord[]>(activeEventId, 'pilots', []);
        if (!Array.isArray(stored) || stored.length === 0) {
          setPilots([]);
          return;
        }

        const storedPilots = stored.map(normalizePilotRecord);
        setPilots(sortPilots(storedPilots));
      } catch {
        setPilots([]);
      } finally {
        setIsHydrated(true);
      }
    })();
  }, [activeEventHydrated, activeEventId, runtimeConfig]);

  useEffect(() => {
    if (!isHydrated || !activeEventHydrated) {
      return;
    }

    void saveModuleState(activeEventId, 'pilots', pilots);
  }, [pilots, isHydrated, activeEventHydrated, activeEventId]);

  const addPilot = (pilot: NewPilotInput): PilotRecord => {
    if (!runtimeConfig) {
      throw new Error('EVENT_CONFIG_NOT_READY');
    }

    validatePilotData(pilot);

    if (pilots.length >= maxPilots) {
      throw new Error('MAX_PILOTS_REACHED');
    }

    const maxNumber = pilots.reduce((max, item) => Math.max(max, item.numeroPiloto), 0);
    const nextNumber = maxNumber + 1;

    const createdPilot: PilotRecord = {
      ...pilot,
      id: pilot.id ?? createPilotId(),
      loginCode: createUniquePilotLoginCode(nextNumber, new Set(pilots.map((item) => item.loginCode))),
      numeroPiloto: nextNumber
    };

    setPilots((prev) => sortPilots([...prev, createdPilot]));
    return createdPilot;
  };

  const updatePilot = (id: string, updatedPilot: PilotRecord) => {
    validatePilotData(updatedPilot);

    setPilots((prev) => {
      const numberIsTaken = prev.some((pilot) => pilot.id !== id && pilot.numeroPiloto === updatedPilot.numeroPiloto);
      const safePilot = numberIsTaken
        ? { ...updatedPilot, numeroPiloto: prev.find((pilot) => pilot.id === id)?.numeroPiloto ?? updatedPilot.numeroPiloto }
        : updatedPilot;

      return sortPilots(prev.map((pilot) => (pilot.id === id ? { ...safePilot, id } : pilot)));
    });
  };

  const deletePilot = (id: string) => {
    setPilots((prev) => prev.filter((pilot) => pilot.id !== id));
  };

  const value = useMemo<PilotsContextValue>(
    () => ({ pilots, isHydrated, addPilot, updatePilot, deletePilot }),
    [pilots, isHydrated]
  );

  return <PilotsContext.Provider value={value}>{children}</PilotsContext.Provider>;
}

export function usePilots() {
  const context = useContext(PilotsContext);
  if (!context) {
    throw new Error('usePilots debe usarse dentro de PilotsProvider');
  }

  return context;
}

function sortPilots(pilotsList: PilotRecord[]) {
  return [...pilotsList].sort((a, b) => a.numeroPiloto - b.numeroPiloto);
}

function createPilotId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `pilot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePilotRecord(pilot: LegacyPilotRecord): PilotRecord {
  const { tandas, hasTimeAttack, ...rest } = pilot;
  const hasTimeAttackFromLegacy = Array.isArray(pilot.tandas) && pilot.tandas.length > 0;

  return {
    ...rest,
    loginCode: normalizePilotLoginCode(pilot.loginCode, pilot.numeroPiloto, pilot.id),
    hasTimeAttack: typeof hasTimeAttack === 'boolean' ? hasTimeAttack : hasTimeAttackFromLegacy
  };
}

function normalizePilotLoginCode(value: unknown, numeroPiloto: number, pilotId: string) {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim().toUpperCase();
  }

  const suffix = pilotId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase().padStart(4, '0');
  return `GP-${String(Math.max(1, numeroPiloto)).padStart(3, '0')}-${suffix}`;
}

function createUniquePilotLoginCode(numeroPiloto: number, existingCodes: Set<string>) {
  let candidate = '';

  do {
    const random = Math.floor(Math.random() * 10000);
    candidate = `GP-${String(numeroPiloto).padStart(3, '0')}-${String(random).padStart(4, '0')}`;
  } while (existingCodes.has(candidate));

  return candidate;
}

function validatePilotData(pilot: Pick<PilotRecord, 'nombre' | 'apellidos' | 'edad' | 'telefono' | 'peso'>) {
  if (pilot.nombre.trim().length === 0) {
    throw new Error('El nombre es obligatorio.');
  }

  if (pilot.apellidos.trim().length === 0) {
    throw new Error('Los apellidos son obligatorios.');
  }

  if (!Number.isInteger(pilot.edad) || pilot.edad < 18 || pilot.edad > 80) {
    throw new Error('La edad debe ser un número entero entre 18 y 80.');
  }

  const phone = pilot.telefono.trim();
  if (!PHONE_REGEX.test(phone)) {
    throw new Error('El teléfono debe tener exactamente 9 dígitos numéricos.');
  }

  if (pilot.peso !== null) {
    if (!Number.isFinite(pilot.peso) || pilot.peso < 40 || pilot.peso > 150) {
      throw new Error('El peso debe estar entre 40 y 150 kg.');
    }
  }
}
