'use client';

import { LucideIcon, LayoutDashboard, ListTodo, CheckSquare, Settings, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type MobileMenuProps = {
    isOpen: boolean;
    onClose: () => void;
};

type MenuItemProps = {
    icon: LucideIcon;
    label: string;
    href: string;
    active?: boolean;
    onClick?: () => void;
};

const MenuItem = ({ icon: Icon, label, href, active, onClick }: MenuItemProps) => (
    <Link
        href={href}
        onClick={onClick}
        className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all ${active
            ? 'bg-blue-600/10 text-blue-500'
            : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
            }`}
    >
        <Icon size={24} strokeWidth={1.5} />
        <span className="font-medium text-lg">{label}</span>
        {active && (
            <div className="ml-auto w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
        )}
    </Link>
);

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
    const pathname = usePathname();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
                    />

                    {/* Menu Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-80 bg-[#0a0a0a] border-l border-white/10 z-[70] p-6 flex flex-col md:hidden shadow-2xl shadow-black"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
                                    <div className="w-3 h-3 bg-white rounded-full"></div>
                                </div>
                                <span className="font-bold text-lg tracking-tight text-white">AntiGravity</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full bg-neutral-900 text-neutral-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mb-6">
                            <button onClick={onClose} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-left group">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                    <span className="font-bold text-lg">+</span>
                                </div>
                                <div>
                                    <span className="block text-sm font-medium text-white">New Mission</span>
                                    <span className="block text-xs text-neutral-500">Start fresh orbit</span>
                                </div>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-6">
                            <div>
                                <h3 className="px-4 text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wider">Orbit Control</h3>
                                <nav className="space-y-0.5">
                                    <MenuItem icon={LayoutDashboard} label="Mission Center" href="/" active={pathname === '/'} onClick={onClose} />
                                    <MenuItem icon={ListTodo} label="My Tasks" href="/my-tasks" active={pathname === '/my-tasks'} onClick={onClose} />
                                    <MenuItem icon={CheckSquare} label="Completed" href="/completed" active={pathname === '/completed'} onClick={onClose} />
                                </nav>
                            </div>
                            <div>
                                <h3 className="px-4 text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wider">Archives</h3>
                                <nav className="space-y-0.5">
                                    <div onClick={onClose} className="px-4 py-3 text-lg text-neutral-400 font-medium hover:text-white cursor-pointer truncate transition-colors">
                                        Project Alpha
                                    </div>
                                    <div onClick={onClose} className="px-4 py-3 text-lg text-neutral-400 font-medium hover:text-white cursor-pointer truncate transition-colors">
                                        Q3 Goals
                                    </div>
                                </nav>
                            </div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-white/5">
                            <Link href="/login" onClick={onClose} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-white/5 transition-colors text-left">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-xs font-bold">
                                    K
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="block text-sm font-medium text-white truncate">Kiran</span>
                                    <span className="block text-xs text-neutral-500 truncate">Sign In / Up &rarr;</span>
                                </div>
                                <Settings size={16} className="text-neutral-500" />
                            </Link>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
