'use client';

import { Bell, Search, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@context/SidebarContext';
import OrgSwitch from './dashboard/OrgSwitch';

export default function Header() {
  const pathname = usePathname();
  const { setIsCollapsed } = useSidebar();

  // Simple breadcrumb logic
  const segments = pathname.split('/').filter(Boolean);
  const pageTitle = segments.length > 0 
    ? segments[segments.length - 1].charAt(0).toUpperCase() + segments[segments.length - 1].slice(1)
    : 'Mission Control';

  return (
    <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsCollapsed(false)}
          className="md:hidden p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <Menu size={20} />
        </button>
        <nav className="flex items-center gap-2 text-sm font-medium">
          <span className="text-muted-foreground">MultiAgent</span>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-foreground">{pageTitle}</span>
        </nav>
        <div className="h-4 w-px bg-border/50 mx-2" />
        <OrgSwitch />
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center relative group">
          <Search size={16} className="absolute left-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search missions..." 
            className="pl-10 pr-4 py-2 bg-accent/50 border border-transparent focus:border-primary/30 focus:bg-background rounded-full text-sm w-64 transition-all outline-none"
          />
        </div>

        <div className="flex items-center gap-1">
          <button className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-xl transition-all">
            <Bell size={19} />
          </button>
          <button className="p-1 leading-none hover:bg-accent/50 rounded-xl transition-all ml-1 border border-transparent hover:border-border/50">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-indigo-500/20">
              JD
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
