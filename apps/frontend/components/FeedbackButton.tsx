'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';

export default function FeedbackButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const pathname = usePathname();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setSubmitting(true);
        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, url_path: pathname }),
            });

            if (res.ok) {
                toast.success('Feedback submitted! Thank you.');
                setIsOpen(false);
                setMessage('');
            } else {
                toast.error('Failed to submit feedback');
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-40 bg-[#141414] hover:bg-[#1a1a1a] border border-white/10 text-gray-300 hover:text-white px-4 py-2 rounded-full font-medium text-sm transition-all shadow-lg flex items-center gap-2 group"
            >
                <svg className="w-4 h-4 text-purple-400 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Feedback
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                                Report Issue / Feedback
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="What did you experience? Bugs, feature requests, or general thoughts..."
                                className="w-full h-32 bg-black border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 resize-none"
                                required
                            />

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !message.trim()}
                                    className="px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg transition-all text-sm font-medium flex items-center gap-2"
                                >
                                    {submitting && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                    Submit Feedback
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
