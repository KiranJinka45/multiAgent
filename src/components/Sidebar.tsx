'use client';

import { LucideIcon, LayoutDashboard, ListTodo, CheckSquare, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type SidebarItemProps = {
    icon: LucideIcon;
    label: string;
    href: string;
    active?: boolean;
};

const SidebarItem = ({ icon: Icon, label, href, active }: SidebarItemProps) => (
    <Link
        href={href}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 group border ${active
            ? 'bg-[#151515] border-white/5 text-white shadow-lg shadow-black/20'
            : 'border-transparent hover:bg-[#151515] hover:border-white/5 text-neutral-500 hover:text-neutral-200'
            }`}
    >
        <Icon size={20} className={active ? 'text-blue-500' : 'group-hover:text-white transition-colors duration-300'} />
        <span className="font-medium text-sm tracking-wide">{label}</span>
        {active && (
            <div className="ml-auto flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse"></div>
            </div>
        )}
    </Link>
);

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0a0a0a]/95 backdrop-blur-xl border-r border-white/5 p-4 flex flex-col hidden md:flex z-50">
            <div className="mb-6">
                <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-left group">
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
                        <SidebarItem
                            icon={LayoutDashboard}
                            label="Mission Center"
                            href="/"
                            active={pathname === '/'}
                        />
                        <SidebarItem
                            icon={ListTodo}
                            label="My Tasks"
                            href="/my-tasks"
                            active={pathname === '/my-tasks'}
                        />
                        <SidebarItem
                            icon={CheckSquare}
                            label="Completed"
                            href="/completed"
                            active={pathname === '/completed'}
                        />
                    </nav>
                </div>

                <div>
                    <h3 className="px-4 text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wider">Archives</h3>
                    <nav className="space-y-0.5">
                        <div className="px-4 py-2 text-sm text-neutral-400 hover:text-white cursor-pointer truncate transition-colors">
                            Project Alpha Launch
                        </div>
                        <div className="px-4 py-2 text-sm text-neutral-400 hover:text-white cursor-pointer truncate transition-colors">
                            Q3 Goals Review
                        </div>
                        <div className="px-4 py-2 text-sm text-neutral-400 hover:text-white cursor-pointer truncate transition-colors">
                            Design System System
                        </div>
                    </nav>
                </div>
            </div>

            <div className="mt-auto pt-4 border-t border-white/5">
                <Link href="/login" className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-white/5 transition-colors text-left group">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-xs font-bold ring-2 ring-transparent group-hover:ring-white/20 transition-all">
                        K
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-white truncate">Kiran</span>
                        <span className="block text-xs text-neutral-500 truncate group-hover:text-blue-400 transition-colors">Sign In / Up &rarr;</span>
                    </div>
                    <Settings size={16} className="text-neutral-500 group-hover:text-white transition-colors" />
                </Link>
            </div>
        </aside>
    );
}
