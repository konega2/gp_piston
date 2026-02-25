import { redirect } from 'next/navigation';
import { DEFAULT_EVENT_ID } from '@/lib/eventStorage';

export default function LegacyTimeAttackRedirectPage() {
  redirect(`/admin/events/${DEFAULT_EVENT_ID}/time-attack`);
}
