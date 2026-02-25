'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearSessionOnReloadIfNeeded, isAdminAuthenticated } from '@/lib/auth/admin-session';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const onLoginRoute = pathname === '/admin/login';
  const [isReady, setIsReady] = useState(onLoginRoute);

  useEffect(() => {
    const handleBeforeUnload = () => {
      clearSessionOnReloadIfNeeded();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    const authenticated = isAdminAuthenticated();

    if (!authenticated && !onLoginRoute) {
      setIsReady(false);
      router.replace('/admin/login');
    } else if (authenticated && onLoginRoute) {
      setIsReady(false);
      router.replace('/admin/events');
    } else {
      setIsReady(true);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [onLoginRoute, pathname, router]);

  if (!isReady && !onLoginRoute) {
    return null;
  }

  return <>{children}</>;
}
