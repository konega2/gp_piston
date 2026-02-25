import type { Metadata } from 'next';
import '@/styles/globals.css';
import { ActiveEventProvider } from '../context/ActiveEventContext';
import { PilotsProvider } from '../context/PilotsContext';
import { TimeAttackProvider } from '../context/TimeAttackContext';
import { ClassificationProvider } from '../context/ClassificationContext';

export const metadata: Metadata = {
  title: 'GP Pistón | Sistema Oficial',
  description: 'Sistema de gestión del campeonato GP Pistón'
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body className="bg-gp-bg text-white antialiased">
        <ActiveEventProvider>
          <PilotsProvider>
            <TimeAttackProvider>
              <ClassificationProvider>{children}</ClassificationProvider>
            </TimeAttackProvider>
          </PilotsProvider>
        </ActiveEventProvider>
      </body>
    </html>
  );
}
