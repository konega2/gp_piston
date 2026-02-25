import { redirect } from 'next/navigation';
import { DEFAULT_EVENT_ID } from '@/lib/eventStorage';

export default function LegacyPilotosListRedirectPage() {
  redirect(`/admin/events/${DEFAULT_EVENT_ID}/pilotos/list`);
}
