'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createEvent, deleteEvent, updateEvent, type EventInput } from '@/lib/events';

const toPositiveInt = (value: FormDataEntryValue | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
};

const parseEventFormData = (formData: FormData): EventInput => {
  const data: EventInput = {
    name: String(formData.get('name') ?? ''),
    date: String(formData.get('date') ?? ''),
    location: String(formData.get('location') ?? ''),
    maxParticipants: toPositiveInt(formData.get('maxParticipants')),
    sessionMaxCapacity: toPositiveInt(formData.get('sessionMaxCapacity')),
    teamsCount: toPositiveInt(formData.get('teamsCount')),
    timeAttackSessions: toPositiveInt(formData.get('timeAttackSessions')),
    qualyGroups: toPositiveInt(formData.get('qualyGroups')),
    raceCount: toPositiveInt(formData.get('raceCount'))
  };

  return data;
};

const messageFromError = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const isNextRedirectError = (error: unknown) => {
  return error instanceof Error && error.message === 'NEXT_REDIRECT';
};

export async function createEventAction(formData: FormData) {
  const payload = parseEventFormData(formData);

  let createError: string | null = null;

  try {
    await createEvent(payload);
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    createError = messageFromError(error, 'No se pudo crear el evento.');
  }

  if (createError) {
    redirect(`/admin/events/create?error=${encodeURIComponent(createError)}`);
  }

  revalidatePath('/admin/events');
  revalidatePath('/admin/events/list');
  redirect('/admin/events/list?success=Evento+creado+correctamente');
}

export async function updateEventAction(formData: FormData) {
  const eventId = String(formData.get('eventId') ?? '');

  if (!eventId) {
    redirect('/admin/events/list?error=Evento+no+v%C3%A1lido');
  }

  let updateError: string | null = null;

  try {
    await updateEvent(eventId, parseEventFormData(formData));
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    updateError = messageFromError(error, 'No se pudo actualizar el evento.');
  }

  if (updateError) {
    redirect(`/admin/events/edit/${eventId}?error=${encodeURIComponent(updateError)}`);
  }

  revalidatePath('/admin/events');
  revalidatePath('/admin/events/list');
  revalidatePath(`/admin/events/edit/${eventId}`);
  redirect('/admin/events/list?success=Evento+actualizado+correctamente');
}

export async function deleteEventAction(formData: FormData) {
  const eventId = String(formData.get('eventId') ?? '');

  if (!eventId) {
    redirect('/admin/events/list?error=Evento+no+v%C3%A1lido');
  }

  let deleteError: string | null = null;

  try {
    await deleteEvent(eventId);
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    deleteError = messageFromError(error, 'No se pudo eliminar el evento.');
  }

  if (deleteError) {
    redirect(`/admin/events/list?error=${encodeURIComponent(deleteError)}`);
  }

  revalidatePath('/admin/events');
  revalidatePath('/admin/events/list');
  redirect('/admin/events/list?success=Evento+eliminado+correctamente');
}
