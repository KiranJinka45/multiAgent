'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { githubService } from '@/lib/github-service';

type SidebarContextType = {
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
    width: number;
    setWidth: (width: number) => void;
    isGithubModalOpen: boolean;
    setIsGithubModalOpen: (open: boolean) => void;
    isGithubConnected: boolean;
    setIsGithubConnected: (connected: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [width, setWidth] = useState(260);

    // Load persistence settings
    useEffect(() => {
        const savedWidth = localStorage.getItem('sidebar-width');
        const savedCollapsed = localStorage.getItem('sidebar-collapsed');
        if (savedWidth) setWidth(parseInt(savedWidth));
        if (savedCollapsed) setIsCollapsed(savedCollapsed === 'true');
    }, []);

    // Save persistence settings
    useEffect(() => {
        localStorage.setItem('sidebar-width', width.toString());
        localStorage.setItem('sidebar-collapsed', isCollapsed.toString());

        // Also set the CSS variable
        const root = document.documentElement;
        if (isCollapsed) {
            root.style.setProperty('--sidebar-width', '0px');
        } else {
            root.style.setProperty('--sidebar-width', `${width}px`);
        }
    }, [width, isCollapsed]);

    const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
    const [isGithubConnected, setIsGithubConnected] = useState(false);

    // Initial GitHub connection check
    useEffect(() => {
        const checkConnection = async () => {
            try {
                const connected = await githubService.isConnected();
                setIsGithubConnected(connected);
            } catch (err) {
                console.error('Error checking github connection:', err);
            }
        };
        checkConnection();
    }, []);

    return (
        <SidebarContext.Provider value={{
            isCollapsed, setIsCollapsed,
            width, setWidth,
            isGithubModalOpen, setIsGithubModalOpen,
            isGithubConnected, setIsGithubConnected
        }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}
