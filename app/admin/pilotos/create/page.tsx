import { redirect } from 'next/navigation';
import { DEFAULT_EVENT_ID } from '@/lib/eventStorage';

export default function LegacyPilotosCreateRedirectPage() {
  redirect(`/admin/events/${DEFAULT_EVENT_ID}/pilotos/create`);
}
