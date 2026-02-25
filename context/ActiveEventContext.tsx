'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { DEFAULT_EVENT_ID, getStoredActiveEventId, setStoredActiveEventId } from '@/lib/eventStorage';

type ActiveEventContextValue = {
  activeEventId: string;
  isHydrated: boolean;
  setActiveEventId: (eventId: string) => void;
};

const ActiveEventContext = createContext<ActiveEventContextValue | null>(null);

export function ActiveEventProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [activeEventId, setActiveEventIdState] = useState(DEFAULT_EVENT_ID);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setActiveEventIdState(getStoredActiveEventId());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const match = pathname.match(/^\/admin\/events\/([^/]+)/);
    const routeEventId = match?.[1];
    if (!routeEventId) {
      return;
    }

    setActiveEventIdState(routeEventId);
  }, [pathname]);

  const setActiveEventId = (eventId: string) => {
    if (typeof eventId !== 'string' || eventId.length === 0) {
      return;
    }

    setStoredActiveEventId(eventId);
    setActiveEventIdState(eventId);
  };

  const value = useMemo<ActiveEventContextValue>(
    () => ({ activeEventId, isHydrated, setActiveEventId }),
    [activeEventId, isHydrated]
  );

  return <ActiveEventContext.Provider value={value}>{children}</ActiveEventContext.Provider>;
}

export function useActiveEvent() {
  const context = useContext(ActiveEventContext);
  if (!context) {
    throw new Error('useActiveEvent debe usarse dentro de ActiveEventProvider');
  }

  return context;
}
