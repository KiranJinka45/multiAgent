'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Linkedin, Instagram, MessageCircle } from 'lucide-react'; // Using Lucide icons
import { useState, useEffect } from 'react';
import { Chat } from '@/types/chat';

type ShareModalProps = {
    isOpen: boolean;
    onClose: () => void;
    chat: Chat;
};

export default function ShareModal({ isOpen, onClose, chat }: ShareModalProps) {
    const [copied, setCopied] = useState(false);
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/share/${chat.id}` : '';

    useEffect(() => {
        if (isOpen) setCopied(false);
    }, [isOpen]);

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSocialShare = (platform: string) => {
        let url = '';
        const text = `Check out this chat I had with MultiAgent: ${chat.title}`;

        switch (platform) {
            case 'x':
                url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
                break;
            case 'linkedin':
                url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
                break;
            case 'whatsapp':
                url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`;
                break;
            case 'instagram':
                // Instagram doesn't support direct link sharing via web URL scheme effectively for posts, 
                // but we can copy to clipboard or open the app. 
                // For web, usually just opening the site is the best we can do, or prompting copy.
                // We'll just open accessibility to the creation flow if possible or the homepage.
                url = `https://instagram.com`;
                break;
        }
        if (url) window.open(url, '_blank');
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl p-6 relative z-10 overflow-hidden"
                >
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold tracking-tight">{chat.title}</h2>
                        <button onClick={onClose} className="rounded-full p-1 hover:bg-accent transition-colors">
                            <X size={20} className="text-muted-foreground" />
                        </button>
                    </div>

                    {/* Preview Area - Mocking a chat screenshot or summary */}
                    <div className="bg-accent/30 rounded-2xl p-6 mb-8 flex items-center justify-center min-h-[160px] border border-border/50">
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-semibold">{chat.title}</h3>
                            <p className="text-sm text-muted-foreground">Shared via MultiAgent</p>
                            <div className="text-xs text-muted-foreground/50 mt-4 font-mono">{new Date(chat.created_at).toLocaleDateString()}</div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-6">
                        <ShareButton
                            icon={<Copy size={20} />}
                            label={copied ? "Copied" : "Copy link"}
                            onClick={handleCopy}
                            active={copied}
                        />
                        <ShareButton
                            icon={<svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>} // X Icon SVG
                            label="X"
                            onClick={() => handleSocialShare('x')}
                        />
                        <ShareButton
                            icon={<Linkedin size={20} />}
                            label="LinkedIn"
                            onClick={() => handleSocialShare('linkedin')}
                        />
                        <ShareButton
                            icon={<MessageCircle size={20} />}
                            label="WhatsApp"
                            onClick={() => handleSocialShare('whatsapp')}
                        />
                        <ShareButton
                            icon={<Instagram size={20} />}
                            label="Instagram"
                            onClick={() => handleSocialShare('instagram')}
                        />
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

function ShareButton({ icon, label, onClick, active }: { icon: React.ReactNode, label: string, onClick: () => void, active?: boolean }) {
    return (
        <div className="flex flex-col items-center gap-2">
            <button
                onClick={onClick}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${active
                        ? 'bg-green-500 text-white shadow-lg scale-110'
                        : 'bg-accent hover:bg-foreground hover:text-background text-foreground'
                    }`}
            >
                {active ? <Check size={20} /> : icon}
            </button>
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
    );
}
