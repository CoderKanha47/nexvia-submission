'use client';

import { SessionProvider } from 'next-auth/react';
import { ToastProvider } from '@/components/ui/toast';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { useThemeShortcut } from '@/components/theme/ThemeToggle';

function ShortcutBridge() {
  useThemeShortcut();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <ToastProvider>
          <ShortcutBridge />
          {children}
        </ToastProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
