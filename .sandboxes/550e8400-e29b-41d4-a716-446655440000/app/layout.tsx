import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "{prefix}globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Pizza Land",
    description: "The best pizza in town",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.className} bg-${primaryColor} text-${textColor}`}>{children}</body>
        </html>
    );
}