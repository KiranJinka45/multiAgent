import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Stress Corp 4 Dashboard",
    description: "A modern dashboard for Stress Corp 4",
};

export default function RootLayout({
    children,
}: Readonly<{
        children: React.ReactNode;
    }>) {
    return (
        <html lang="en">
            <body className={`${inter.className} bg-${process.env.NEXT_PUBLIC_BRAND_PRIMARY_COLOR} text-${process.env.NEXT_PUBLIC_BRAND_TEXT_COLOR}`}>{children}</body>
        </html>
    );
}