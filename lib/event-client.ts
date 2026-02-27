'use client';

import { useEffect, useMemo, useState } from 'react';
import { getEventInfoAction } from '@/app/admin/events/[eventId]/actions';

type EventRuntimeConfig = {
  maxPilots: number;
  sessionMaxCapacity: number;
  timeAttackSessions: number;
  qualyGroups: number;
  teamsCount: number;
  raceCount: number;
};

type EventInfo = {
  exists: boolean;
  name: string | null;
  location: string | null;
  date: string | Date | null;
  config: EventRuntimeConfig | null;
};

const cache = new Map<string, EventInfo>();
const inFlight = new Map<string, Promise<EventInfo>>();

async function fetchEventInfo(eventId: string): Promise<EventInfo> {
  const cached = cache.get(eventId);
  if (cached) {
    return cached;
  }

  const pending = inFlight.get(eventId);
  if (pending) {
    return pending;
  }

  const request = getEventInfoAction(eventId)
    .then((info) => {
      cache.set(eventId, info);
      return info;
    })
    .finally(() => {
      inFlight.delete(eventId);
    });

  inFlight.set(eventId, request);
  return request;
}

export function useEventInfo(eventId: string) {
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(() => cache.get(eventId) ?? null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const info = await fetchEventInfo(eventId);
      if (cancelled) return;

      setEventInfo(info);
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return eventInfo;
}

export function useEventRuntimeConfig(eventId: string) {
  const eventInfo = useEventInfo(eventId);
  return useMemo(() => eventInfo?.config ?? null, [eventInfo]);
}

export function useEventName(eventId: string) {
  const eventInfo = useEventInfo(eventId);
  return eventInfo?.name ?? null;
}
