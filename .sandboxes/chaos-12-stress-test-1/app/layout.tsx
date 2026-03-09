import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import "./globals.css";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: "Stress Corp 1 Dashboard",
    description: "A modern dashboard for Stress Corp 1",
};

export default function RootLayout({
    children,
}: Readonly<{
        children: React.ReactNode;
    }>) {
    return (
        <html lang="en">
            <body className={`${inter.className} bg-${process.env.THEME_PRIMARY}-900 text-${process.env.THEME_TEXT}">
                {children}
            </body>
        </html>
    );
}
