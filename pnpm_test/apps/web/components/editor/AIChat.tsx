'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Zap, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface AIChatProps {
  activeFile: string;
  code: string;
  projectId: string;
  onApplyPatch?: (patch: string) => void;
}

export default function AIChat({ activeFile, code, projectId, onApplyPatch }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: `Hello! I'm your MultiAgent pair programmer. I have context of your active file: **${activeFile}**. How can I help you today?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsg,
          code,
          activeFile,
          projectId
        })
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.reply || "Thinking..." }]);
    } catch (err) {
      console.error('[AI-Chat] Error:', err);
      setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I encountered an issue while processing your request." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-l border-white/10 w-80 select-none overflow-hidden animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-white/5 shadow-sm">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">AI Pair Programmer</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
           <Zap size={10} className="text-primary" fill="currentColor" />
           <span className="text-[9px] font-black text-primary uppercase">Pro Mode</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[90%] rounded-2xl p-3 text-xs leading-relaxed shadow-lg ${
              msg.role === 'user' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-[#2d2d2d] text-gray-200 border border-white/5'
            }`}>
              {msg.content}
              {msg.role === 'ai' && msg.content.includes('patch') && (
                <button 
                  onClick={() => onApplyPatch?.("// Suggested patch content\nconsole.log('applied');")}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 rounded-lg font-bold transition-all"
                >
                  <Sparkles size={12} />
                  Apply Patch
                </button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-[#2d2d2d] rounded-2xl p-3 border border-white/5 flex gap-1">
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:0.4s]" />
             </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-white/5 bg-black/10">
         <button onClick={() => setInput("Explain this code")} className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] font-bold text-gray-400 border border-white/5 transition-all">Explain</button>
         <button onClick={() => setInput("Add unit tests")} className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] font-bold text-gray-400 border border-white/5 transition-all">Tests</button>
         <button onClick={() => setInput("Refactor for performance")} className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] font-bold text-gray-400 border border-white/5 transition-all">Refactor</button>
      </div>

      <div className="p-4 bg-[#252526] border-t border-white/5">
        <div className="relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask AI to code..."
            className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-3 text-xs pr-12 focus:outline-none focus:border-primary/50 transition-all placeholder:text-gray-600"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1.5 p-2 rounded-lg bg-primary hover:opacity-90 transition-all disabled:opacity-30 flex items-center justify-center text-primary-foreground"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
