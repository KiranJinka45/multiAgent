import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MultiAgent API Gateway',
  description: 'Operational',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
