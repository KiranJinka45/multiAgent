import type { Metadata } from "next";
            import { Inter } from "next/font/google";
            import './globals.css';

            const inter = Inter({ subsets: ["latin"] });

            export const metadata: Metadata = {
                title: "SaaS Landing Page",
                description: "Your description here",
            };

            export default function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
                return (
                    <html lang="en">
                        <body className={`${inter.className} bg-${process.env.THEME_PRIMARY_COLOR} text-slate-50`}>{children}</body>
                    </html>
                );
            }