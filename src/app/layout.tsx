
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased selection:bg-blue-500/30`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" richColors theme="dark" />
        </ThemeProvider>
      </body>
    </html>
  );
}
