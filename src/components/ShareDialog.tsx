import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Share2, Linkedin, Instagram, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ShareDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    summary: string;
}

export default function ShareDialog({ isOpen, onClose, title, summary }: ShareDialogProps) {
    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard");
    };

    const socialLinks = [
        { name: 'Copy link', icon: <Copy size={20} />, action: handleCopyLink, bg: 'bg-neutral-900', text: 'text-white' },
        { name: 'X', icon: <span className="text-lg font-bold">𝕏</span>, action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(window.location.href)}`, '_blank'), bg: 'bg-black', text: 'text-white' },
        { name: 'LinkedIn', icon: <Linkedin size={20} />, action: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank'), bg: 'bg-[#0077b5]', text: 'text-white' },
        { name: 'WhatsApp', icon: <MessageCircle size={20} />, action: () => window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + window.location.href)}`, '_blank'), bg: 'bg-[#25D366]', text: 'text-white' },
        { name: 'Instagram', icon: <Instagram size={20} />, action: () => window.open('https://instagram.com', '_blank'), bg: 'bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888]', text: 'text-white' },
    ];

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
                        className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-[70] pointer-events-none p-4"
                    >
                        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl w-full max-w-md pointer-events-auto overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800">
                                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 truncate pr-4">
                                    {title || 'Share Chat'}
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="p-1 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content Preview */}
                            <div className="p-6 bg-neutral-50 dark:bg-neutral-950/50">
                                <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-sm relative">
                                    <div className="absolute left-0 top-4 bottom-4 w-1 bg-gradient-to-b from-blue-500 to-purple-600 rounded-r-full" />
                                    <p className="text-sm text-neutral-600 dark:text-neutral-300 line-clamp-3 ml-2 font-medium">
                                        {summary}
                                    </p>
                                    <div className="mt-3 flex items-center justify-end">
                                        <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">MultiAgent AI</span>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <h4 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                                        <span className="text-lg">🚨</span> What This Means
                                    </h4>
                                    <ul className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1.5 list-disc pl-4">
                                        <li>Sharing this link allows others to view this conversation.</li>
                                        <li>Your personal data is not shared.</li>
                                        <li>Anyone with the link can access the chat history up to this point.</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-6 pt-2 flex items-center justify-center gap-6">
                                {socialLinks.map((link) => (
                                    <div key={link.name} className="flex flex-col items-center gap-2">
                                        <button
                                            onClick={link.action}
                                            className={`w-12 h-12 rounded-full flex items-center justify-center ${link.bg} ${link.text} hover:scale-110 transition-transform shadow-lg`}
                                            title={link.name}
                                        >
                                            {link.icon}
                                        </button>
                                        <span className="text-[10px] font-medium text-neutral-500">{link.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
