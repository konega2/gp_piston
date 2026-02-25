import { redirect } from 'next/navigation';
import { DEFAULT_EVENT_ID } from '@/lib/eventStorage';

export default function LegacyResultsRedirectPage() {
  redirect(`/admin/events/${DEFAULT_EVENT_ID}/results`);
}
