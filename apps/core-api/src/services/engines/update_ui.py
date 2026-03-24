import os

file_path = "c:/Users/Kiran/OneDrive/Desktop/MultiAgent/src/app/projects/[id]/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. State vars
content = content.replace(
    "const [isGenerating, setIsGenerating] = useState(false);",
    "const [isGenerating, setIsGenerating] = useState(false);\n    const [userReply, setUserReply] = useState<string | null>(null);\n    const [replyText, setReplyText] = useState(\"\");\n    const [hasStartedGenerating, setHasStartedGenerating] = useState(false);"
)

# 2. Add submit Clarification
content = content.replace(
    "const loadProjectData = useCallback(async () => {",
    """const submitClarification = () => {
        if (!replyText.trim()) return;
        setUserReply(replyText);
        setHasStartedGenerating(true);
        projectService.updateProject(params.id, { description: project?.description + '\\n\\nPreferences: ' + replyText }).then(() => {
            handleGenerate();
        });
    };

    const loadProjectData = useCallback(async () => {""",
    1
)

# 3. Disable auto-gen
content = content.replace(
    """if (p.status === 'draft') {
                handleGenerate();
            }""",
    """if (p.status === 'draft') {
                // handleGenerate(); // Disabled for clarification phase
            }"""
)

# 4. Overhaul the main panel rendering
main_start_tag = '<main className="flex-1 flex overflow-hidden relative">'

new_main = """<main className="flex-1 flex overflow-hidden relative bg-[#0a0a0a]">
                    {(files.length === 0 && (!hasStartedGenerating || project?.status === 'draft' || project?.status.startsWith('generating') || project?.status === 'brainstorming')) ? (
                        <div className="flex-1 flex w-full">
                            {/* Left Panel: Chat Phase */}
                            <div className="w-1/2 border-r border-white/5 bg-[#0d0d0d] flex flex-col pt-10 px-8 relative">
                                <div className="flex items-center gap-2 mb-8 text-primary font-bold text-lg"><Globe size={20} /> MultiAgent</div>
                                <div className="flex-1 overflow-y-auto space-y-6 pb-24 custom-scrollbar pr-4">
                                    {/* User Original Prompt */}
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5 text-sm text-gray-300 shadow-xl">
                                        {project?.description?.split('\\n\\nPreferences:')[0]}
                                    </motion.div>
                                    
                                    {/* AI Clarification Questions */}
                                    {project?.status === 'draft' && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-primary/5 rounded-2xl p-6 border border-primary/20 text-sm text-gray-300 space-y-5 shadow-lg relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                                            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                                                <Sparkles size={14} className="animate-pulse" />
                                                Agent is asking a question
                                            </div>
                                            <div className="text-gray-200 font-medium">
                                                Before I start building, I need to clarify a few key aspects of your platform:
                                            </div>
                                            <div className="space-y-3 pl-2 text-gray-400">
                                                <p><strong className="text-gray-200">1. Frontend Framework</strong> - a. React (Next.js) b. Vue c. Vanilla JS</p>
                                                <p><strong className="text-gray-200">2. Backend & Database</strong> - a. Supabase (PostgreSQL) b. Firebase c. Node/Mongo</p>
                                                <p><strong className="text-gray-200">3. Styling Preference</strong> - a. Tailwind CSS b. Custom CSS c. Material UI</p>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* User Reply */}
                                    {userReply && (
                                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5 text-sm text-gray-300 shadow-xl self-end mt-6 ml-auto max-w-[80%] border-primary/30 text-right">
                                            {userReply}
                                        </motion.div>
                                    )}

                                    {/* Generating State */}
                                    {isGenerating && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-primary/5 rounded-2xl p-6 border border-primary/20 text-sm text-gray-300 shadow-lg relative overflow-hidden mt-6 flex flex-col gap-4">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                                            <div className="flex items-center gap-3">
                                                <Loader2 size={16} className="text-primary animate-spin" />
                                                <span className="text-primary font-bold text-xs uppercase tracking-widest">Building Infrastructure</span>
                                            </div>
                                            <p className="text-gray-400">I'll set up your core structure now and we'll iterate from there. Let's build.</p>
                                            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                                                <motion.div 
                                                    className="h-full bg-primary" 
                                                    initial={{ width: "10%" }} 
                                                    animate={{ width: "100%" }} 
                                                    transition={{ duration: 15, ease: "linear" }}
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                                
                                {/* Input Box */}
                                {!userReply && project?.status === 'draft' && (
                                    <div className="absolute bottom-6 flex-1 w-[calc(100%-4rem)]">
                                        <div className="bg-[#141414] border border-white/10 rounded-2xl p-2 flex items-center shadow-2xl focus-within:border-primary/50 transition-colors">
                                            <textarea 
                                                placeholder="Message Agent (e.g., 1a, 2a, 3a)..." 
                                                className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-200 p-3 min-h-[44px] max-h-32"
                                                value={replyText}
                                                onChange={e => setReplyText(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        submitClarification();
                                                    }
                                                }}
                                            />
                                            <button onClick={submitClarification} disabled={!replyText.trim() || isGenerating} className="p-3 bg-primary rounded-xl text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                                                <ChevronRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Panel: Placeholder Preview */}
                            <div className="w-1/2 bg-[#050505] flex items-center justify-center p-12 relative overflow-hidden">
                                {/* Grid background */}
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
                                
                                <div className="relative z-10 text-center space-y-8 w-full max-w-md">
                                    <Sparkles size={32} className="text-gray-500 mx-auto" />
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-lg">Deploy Your Application</h2>
                                        <p className="text-sm text-gray-400">Make your app publicly available with managed infrastructure.</p>
                                    </div>
                                    
                                    <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden transform hover:scale-[1.02] transition-transform">
                                        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                                                <Globe size={14} className="text-gray-500" /> Deployments
                                            </div>
                                        </div>
                                        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5 flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 bg-green-500/80 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                                <div className="text-sm text-gray-300 font-medium tracking-tight">Live <span className="text-gray-500 font-mono ml-2 text-xs">multiagent.app</span></div>
                                            </div>
                                            <button className="px-4 py-1.5 bg-white text-black text-xs font-bold rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">Visit ↗</button>
                                        </div>
                                    </div>
                                    
                                    {isGenerating && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center mt-12 gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce delay-100" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce delay-200" />
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-[#1a1a1a] border border-white/10 p-1 rounded-r-lg hover:bg-primary/20 hover:text-primary transition-all shadow-xl">
                                {isSidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
                            </button>
                            
                            {/* Re-generating sleek banner */}
                            <AnimatePresence>
                                {isGenerating && files.length > 0 && (
                                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a1a]/90 backdrop-blur-md px-4 py-2 rounded-full border border-primary/30 shadow-2xl flex items-center gap-3">
                                        <Loader2 size={14} className="text-primary animate-spin" />
                                        <span className="text-xs font-bold text-gray-200 uppercase tracking-widest">Rebuilding Core Engine...</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex-1 flex overflow-hidden">
                                {(viewMode === 'editor' || viewMode === 'split') && ("""

# We need to replace from `<main` to `<div className="flex-1 flex overflow-hidden">\s*{(viewMode === 'editor'`
# including the old MultiAgent is Building block.

import re
pattern = r'<main className="flex-1 flex overflow-hidden relative">.*?<div className="flex-1 flex overflow-hidden">\s*\{\(viewMode === \'editor\' \|\| viewMode === \'split\'\) && \('
# We must use DOTALL to match across newlines
match = re.search(pattern, content, re.DOTALL)
if match:
    # Need to also append the closing tag for the new logic
    # Find the closing </main>
    content = content[:match.start()] + new_main + content[match.end():]
    
    # We opened a generic wrapper `<>` after the `) : (` so we need to close it before `</main>`
    content = content.replace("</main>", "</>\n                    )}\n                </main>")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("UI Overhauled successfully!")
else:
    print("Could not find match for main block.")
