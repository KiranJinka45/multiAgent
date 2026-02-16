'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';

type TopNavProps = {
    onOpenMobileMenu?: () => void;
};

export default function TopNav({ onOpenMobileMenu }: TopNavProps) {
    return (
        <div className="absolute top-6 right-6 z-50 flex items-center gap-4">
            {/* Mobile Menu Trigger */}
            <button
                onClick={onOpenMobileMenu}
                className="md:hidden p-2 text-neutral-400 hover:text-white transition-colors"
            >
                <Menu size={24} />
            </button>

            {/* Auth Buttons */}
            <div className="flex items-center gap-4">
                <Link
                    href="/login"
                    className="text-sm font-medium text-neutral-400 hover:text-white transition-colors hidden sm:block"
                >
                    Log In
                </Link>
                <Link
                    href="/login?mode=register"
                    className="px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-neutral-200 transition-colors shadow-lg shadow-white/10"
                >
                    Sign Up
                </Link>
            </div>
        </div>
    );
}
