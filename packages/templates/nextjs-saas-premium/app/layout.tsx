import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@packages/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MultiAgent Premium SaaS",
  description: "Built with Level-5 Autonomous Architecture",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn(inter.className, "bg-black text-white antialiased")}>
        {children}
      </body>
    </html>
  );
}
