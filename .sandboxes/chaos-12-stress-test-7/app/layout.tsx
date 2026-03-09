import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Stress Corp 7 Dashboard',
    description: 'A modern dashboard for Stress Corp 7.',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <style>
                    /* Update theme colors */
                    :root {
                        --primary-color: #3b82f6;
                        
                    }
                </style>
            </head>
            <body className={`${inter.className} bg-slate-950 text-slate-50`}>{children}</body>
        </html>
    );
}