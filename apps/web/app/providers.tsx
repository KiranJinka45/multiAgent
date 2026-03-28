'use client';

import { SidebarProvider } from '@packages/context';
import { Toaster } from 'sonner';
import { ThemeProvider } from 'next-themes';

/**
 * Global Client-side Providers.
 * This component acts as the client-side boundary for all context providers.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <SidebarProvider>
        {children}
        <Toaster position="top-center" richColors />
      </SidebarProvider>
    </ThemeProvider>
  );
}
