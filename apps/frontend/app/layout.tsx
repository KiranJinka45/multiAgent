
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from "@components/ThemeProvider";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MultiAgent | System Online',
  description: 'MultiAgent Application',
  icons: {
    icon: "/favicon.ico"
  }
};

import { Toaster } from 'sonner';
import { SidebarProvider } from '@packages/context';
import CommandPalette from '@components/CommandPalette';
import FeedbackButton from '@components/FeedbackButton';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased selection:bg-primary/30`}>
        <SidebarProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <div className="flex h-screen w-full bg-background overflow-hidden">
                {children}
            </div>
            <CommandPalette />
            <FeedbackButton />
            <Toaster position="top-center" richColors theme="dark" />
          </ThemeProvider>
        </SidebarProvider>
      </body>
    </html>
  );
}
