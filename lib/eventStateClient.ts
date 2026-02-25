'use client';

import {
  getEventModuleStateAction,
  saveEventModuleStateAction
} from '@/app/admin/events/[eventId]/actions';
import type { EventModuleKey } from '@/lib/eventState';

export async function loadModuleState<T>(eventId: string, moduleKey: EventModuleKey, fallback: T): Promise<T> {
  try {
    const payload = await getEventModuleStateAction(eventId, moduleKey);
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
}
