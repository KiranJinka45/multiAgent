'use client';

import Link from 'next/link';
import { Menu, PanelLeft, ChevronDown, Sparkles } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';
import { useSidebar } from '@/context/SidebarContext';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

type TopNavProps = {
    onOpenMobileMenu?: () => void;
};

export default function TopNav({ onOpenMobileMenu }: TopNavProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const { isCollapsed, setIsCollapsed } = useSidebar();
    const pathname = usePathname();
    const supabase = createClientComponentClient();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setIsAuthenticated(!!session);
        };
        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsAuthenticated(!!session);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    return (
        <header
            className="fixed top-0 right-0 h-14 bg-background/80 backdrop-blur-md z-[40] flex items-center px-4 transition-[left] duration-300 ease-in-out"
            style={{ left: 'var(--sidebar-width, 260px)' }}
        >
            <div className="flex items-center gap-1">
                {/* Logo and Toggle (Only shown when sidebar is collapsed) */}
                <AnimatePresence>
                    {isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="flex items-center gap-0.5 mr-2"
                        >
                            <div className="p-2">
                                <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center">
                                    <Sparkles size={14} className="text-background" />
                                </div>
                            </div>

                            <button
                                onClick={() => setIsCollapsed(false)}
                                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            >
                                <PanelLeft size={20} className="rotate-180" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Model Selector */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl hover:bg-accent transition-colors cursor-pointer group">
                    <span className="text-[15px] font-semibold text-foreground/90 tracking-tight">
                        MultiAgent <span className="text-muted-foreground font-medium ml-0.5 text-[13px]">1.0 Pro</span>
                    </span>
                    <ChevronDown size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
            </div>

            <div className="ml-auto flex items-center gap-3">
                {/* Mobile Menu Trigger */}
                <button
                    onClick={onOpenMobileMenu}
                    className="md:hidden p-2 text-neutral-400 hover:text-white transition-colors"
                >
                    <Menu size={24} />
                </button>

                {/* Auth Buttons */}
                {!isAuthenticated && (
                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="text-sm font-medium text-neutral-400 hover:text-white transition-colors hidden sm:block"
                        >
                            Log In
                        </Link>
                        <Link
                            href="/login?mode=register"
                            className="px-4 py-1.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                        >
                            Sign Up
                        </Link>
                    </div>
                )}
            </div>
        </header>
    );
}
