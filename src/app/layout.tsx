
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MultiAgent | System Online',
  description: 'MultiAgent Application',
};

import { Toaster } from 'sonner';
import { SidebarProvider } from '@/context/SidebarContext';
import CommandPalette from '@/components/CommandPalette';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased selection:bg-blue-500/30`}>
        <SidebarProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <CommandPalette />
            <Toaster position="top-center" richColors theme="dark" />
          </ThemeProvider>
        </SidebarProvider>
      </body>
    </html>
  );
}
