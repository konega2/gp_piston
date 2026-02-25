'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { PilotRecord } from '@/data/pilots';
import { useActiveEvent } from '@/context/ActiveEventContext';
import { getEventRuntimeConfig } from '../lib/eventStorage';
import { loadModuleState, saveModuleState } from '@/lib/eventStateClient';

type NewPilotInput = Omit<PilotRecord, 'id' | 'numeroPiloto'> & {
  id?: string;
};

type LegacyPilotRecord = Omit<PilotRecord, 'hasTimeAttack'> & {
  hasTimeAttack?: boolean;
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
  const [pilots, setPilots] = useState<PilotRecord[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const maxPilots = useMemo(() => getEventRuntimeConfig(activeEventId).maxPilots, [activeEventId]);

  useEffect(() => {
    if (!activeEventHydrated) {
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
  }, [activeEventHydrated, activeEventId]);

  useEffect(() => {
    if (!isHydrated || !activeEventHydrated) {
      return;
    }

    void saveModuleState(activeEventId, 'pilots', pilots);
  }, [pilots, isHydrated, activeEventHydrated, activeEventId]);

  const addPilot = (pilot: NewPilotInput): PilotRecord => {
    if (pilots.length >= maxPilots) {
      throw new Error('MAX_PILOTS_REACHED');
    }

    const maxNumber = pilots.reduce((max, item) => Math.max(max, item.numeroPiloto), 0);
    const nextNumber = maxNumber + 1;

    const createdPilot: PilotRecord = {
      ...pilot,
      id: pilot.id ?? createPilotId(),
      numeroPiloto: nextNumber
    };

    setPilots((prev) => sortPilots([...prev, createdPilot]));
    return createdPilot;
  };

  const updatePilot = (id: string, updatedPilot: PilotRecord) => {
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
    hasTimeAttack: typeof hasTimeAttack === 'boolean' ? hasTimeAttack : hasTimeAttackFromLegacy
  };
}
