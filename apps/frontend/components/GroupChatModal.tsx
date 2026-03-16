'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Plus, User } from 'lucide-react';

type GroupChatModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onCreateGroup: (name: string, members: string[]) => void;
};

export default function GroupChatModal({ isOpen, onClose, onCreateGroup }: GroupChatModalProps) {
    const [groupName, setGroupName] = useState('');
    const [memberInput, setMemberInput] = useState('');
    const [members, setMembers] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setGroupName('');
            setMembers([]);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleAddMember = (e: React.FormEvent) => {
        e.preventDefault();
        if (memberInput.trim()) {
            setMembers([...members, memberInput.trim()]);
            setMemberInput('');
        }
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (groupName.trim()) {
            onCreateGroup(groupName.trim(), members);
            onClose();
        }
    };

    const removeMember = (index: number) => {
        setMembers(members.filter((_, i) => i !== index));
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
                    className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 relative z-10"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                <Users size={20} />
                            </div>
                            <h2 className="text-lg font-semibold">Create Group Chat</h2>
                        </div>
                        <button onClick={onClose} className="rounded-full p-1 hover:bg-accent transition-colors">
                            <X size={20} className="text-muted-foreground" />
                        </button>
                    </div>

                    <form onSubmit={handleCreate} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Group Name</label>
                            <input
                                ref={inputRef}
                                type="text"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder="e.g. Project Alpha Team"
                                className="w-full px-4 py-2.5 bg-accent/20 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                required
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Add Members</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={memberInput}
                                    onChange={(e) => setMemberInput(e.target.value)}
                                    placeholder="Enter name or email..."
                                    className="flex-1 px-4 py-2.5 bg-accent/20 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMember(e))}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddMember}
                                    className="px-3 bg-accent hover:bg-accent/80 rounded-xl text-foreground transition-colors"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            {/* Members List */}
                            <div className="flex flex-wrap gap-2 mt-2">
                                {members.map((member, idx) => (
                                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-accent/50 rounded-lg text-xs font-medium border border-border">
                                        <User size={12} className="text-primary" />
                                        <span>{member}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeMember(idx)}
                                            className="ml-1 hover:text-red-500 transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
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
                                Create Group
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
