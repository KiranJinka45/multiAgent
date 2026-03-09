import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "{}/globals.css";

const inter = Inter({ subsets: ["latin"] });

import { StressCorp2Style } from "{}/globals.css";

export const metadata: Metadata = {
    title: "Stress Corp 2 Dashboard",
    description: "Stress Corp 2 Stress Management Dashboard",
};  
export default function RootLayout({
    children,
}: Readonly<{
        children: React.ReactNode;
    }>) {
    return (
        <html lang="en">
            <body className={`${inter.className} ${StressCorp2Style.className}`}>{children}</body>
        </html>
    );
}
