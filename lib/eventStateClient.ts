'use client';

import {
  getEventModuleStateAction,
  saveEventModuleStateAction
} from '@/app/admin/events/[eventId]/actions';
import type { EventModuleKey } from '@/lib/eventState';

const moduleCache = new Map<string, unknown>();
const inFlightLoads = new Map<string, Promise<unknown>>();

const cacheKey = (eventId: string, moduleKey: EventModuleKey) => `${eventId}:${moduleKey}`;

export async function loadModuleState<T>(eventId: string, moduleKey: EventModuleKey, fallback: T): Promise<T> {
  const key = cacheKey(eventId, moduleKey);

  if (moduleCache.has(key)) {
    const cached = moduleCache.get(key);
    if (cached === null || typeof cached === 'undefined') {
      return fallback;
    }

    return cached as T;
  }

  const pending = inFlightLoads.get(key);
  if (pending) {
    const payload = await pending;
    if (payload === null || typeof payload === 'undefined') {
      return fallback;
    }

    return payload as T;
  }

  try {
    const loadPromise = getEventModuleStateAction(eventId, moduleKey)
      .then((payload) => {
        moduleCache.set(key, payload);
        return payload;
      })
      .finally(() => {
        inFlightLoads.delete(key);
      });

    inFlightLoads.set(key, loadPromise);

    const payload = await loadPromise;
    if (payload === null || typeof payload === 'undefined') {
      return fallback;
    }

    return payload as T;
  } catch {
    return fallback;
  }
}

export async function saveModuleState(eventId: string, moduleKey: EventModuleKey, payload: unknown): Promise<void> {
  await saveEventModuleStateAction(eventId, moduleKey, payload);

  const key = cacheKey(eventId, moduleKey);
  moduleCache.set(key, payload);
  inFlightLoads.delete(key);
}
