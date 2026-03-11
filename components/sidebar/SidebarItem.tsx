'use client';

import { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type SidebarItemProps = {
    icon: LucideIcon;
    label: string;
    href: string;
    active?: boolean;
    onClick?: () => void;
    badge?: React.ReactNode;
};

export const SidebarItem = ({ icon: Icon, label, href, active, onClick, badge }: SidebarItemProps) => {
    const router = useRouter();

    const content = (
        <div
            className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all duration-300 group ${active
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                }`}
        >
            <Icon size={18} className={active ? 'text-primary' : 'group-hover:text-foreground transition-all duration-300'} />
            <span className="font-semibold text-sm tracking-tight flex-1">{label}</span>
            {badge}
        </div>
    );

    if (onClick) {
        return <button onClick={onClick} className="w-full text-left">{content}</button>;
    }

    return (
        <Link
            href={href}
            onMouseEnter={() => router.prefetch(href)}
            className="block w-full"
        >
            {content}
        </Link>
    );
};
