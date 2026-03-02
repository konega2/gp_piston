import { redirect } from 'next/navigation';
import { DEFAULT_EVENT_ID } from '@/lib/eventStorage';

export default function LegacyRacesRedirectPage() {
  redirect(`/admin/events/${DEFAULT_EVENT_ID}/races`);
}
