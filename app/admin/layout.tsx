'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearSessionOnReloadIfNeeded, isAdminAuthenticated } from '@/lib/auth/admin-session';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = () => {
      clearSessionOnReloadIfNeeded();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    const authenticated = isAdminAuthenticated();
    const onLoginRoute = pathname === '/admin/login';

    if (!authenticated && !onLoginRoute) {
      router.replace('/admin/login');
      return;
    }

    if (authenticated && onLoginRoute) {
      router.replace('/admin/events');
      return;
    }

    setIsReady(true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [pathname, router]);

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}
