'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { hardResetStorageToTestEventIfNeeded, hydrateTestEventWithChampionshipDataIfNeeded } from '@/lib/eventStorage';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const result = hardResetStorageToTestEventIfNeeded();
    hydrateTestEventWithChampionshipDataIfNeeded();
    if (result.reset && result.eventId) {
      const target = `/admin/events/${result.eventId}/dashboard`;
      if (pathname !== target) {
        router.replace(target);
      }
    }
  }, [pathname, router]);

  return <>{children}</>;
}
