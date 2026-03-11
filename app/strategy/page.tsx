'use client';

import Sidebar from '@/components/Sidebar';
import TopNav from '@/components/TopNav';
import StrategyGuide from '@/components/StrategyGuide';
import { useState } from 'react';
import MobileMenu from '@/components/MobileMenu';

export default function StrategyPage() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
            <Sidebar />
            <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <main
                style={{ marginLeft: 'var(--sidebar-width, 260px)' }}
                className="flex-1 flex flex-col h-full relative transition-[margin] duration-300 ease-in-out overflow-y-auto"
            >
                <TopNav onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
                <div className="pt-24 pb-20">
                    <StrategyGuide />
                </div>
            </main>
        </div>
    );
}
