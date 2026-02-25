import { redirect } from 'next/navigation';
import { DEFAULT_EVENT_ID } from '@/lib/eventStorage';

export default function LegacyPilotoProfileRedirectPage({
  params
}: {
  params: {
    id: string;
  };
}) {
  redirect(`/admin/events/${DEFAULT_EVENT_ID}/pilotos/${params.id}`);
}
