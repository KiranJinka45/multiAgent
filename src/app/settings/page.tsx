import TopNav from '@/components/TopNav';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import MobileMenu from '@/components/MobileMenu';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden selection:bg-blue-500/30">
            <Sidebar />
            <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <main className="flex-1 flex flex-col h-full relative md:ml-64">
                <TopNav onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
                <div className="fixed top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#050505] to-transparent z-10 pointer-events-none" />

                <div className="flex-1 overflow-y-auto w-full scroll-smooth">
                    <div className="max-w-4xl mx-auto w-full px-6 pt-20 pb-40">
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <header className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                    <Settings className="text-neutral-400" />
                                    Settings
                                </h2>
                            </header>

                            <div className="p-8 rounded-2xl border border-white/5 bg-white/5">
                                <p className="text-neutral-400">Settings panel is under construction.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
