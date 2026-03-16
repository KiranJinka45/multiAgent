'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3 } from 'lucide-react';

type RenameModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onRename: (newTitle: string) => void;
    initialTitle: string;
};

export default function RenameModal({ isOpen, onClose, onRename, initialTitle }: RenameModalProps) {
    const [title, setTitle] = useState(initialTitle);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTitle(initialTitle);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, initialTitle]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim()) {
            onRename(title.trim());
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
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
                        className="w-full max-w-md glass-card rounded-[2rem] shadow-2xl p-8 relative z-10 overflow-hidden"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-foreground font-semibold">
                                <Edit3 size={18} className="text-primary" />
                                <span>Rename Mission</span>
                            </div>
                            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" type="button">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground ml-1">Title</label>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Enter chat title..."
                                    className="w-full px-4 py-2.5 bg-accent/20 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-all"
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
