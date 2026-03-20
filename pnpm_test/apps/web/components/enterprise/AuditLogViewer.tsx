'use client';

import { motion } from 'framer-motion';
import { Shield, Clock, User, MessageSquare, Activity } from 'lucide-react';

const LOGS = [
  { action: 'Role Updated', target: 'Kyle Reese', actor: 'Sarah Connor', date: '2 min ago', type: 'ADMIN' },
  { action: 'Project Forked', target: 'todo-app-v2', actor: 'Sarah Connor', date: '15 min ago', type: 'DEV' },
  { action: 'Secret Redacted', target: 'AI Output Filter', actor: 'System', date: '1 hour ago', type: 'SAFETY' },
  { action: 'Provisioned User', target: 'John Connor', actor: 'Okta SCIM', date: '5 hours ago', type: 'SSO' },
];

export default function AuditLogViewer() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity size={18} className="text-primary" />
          Enterprise Audit Logs
        </h3>
        <p className="text-xs text-gray-500 font-medium">Tracking all administrative and agentic operations.</p>
      </div>

      <div className="space-y-3">
        {LOGS.map((log, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/[0.07] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-xl border ${log.type === 'SAFETY' ? 'border-amber-500/20 bg-amber-500/10 text-amber-500' : 'border-white/10 bg-black/20 text-gray-400'}`}>
                {log.type === 'SAFETY' ? <Shield size={14} /> : <Clock size={14} />}
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-black text-white">{log.action}: <span className="text-gray-400 font-bold">{log.target}</span></div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                  <User size={10} />
                  {log.actor}
                </div>
              </div>
            </div>
            <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest group-hover:text-gray-400 transition-colors">
              {log.date}
            </div>
          </motion.div>
        ))}
      </div>
      
      <button className="w-full py-3 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white hover:bg-white/10 transition-all">
        Export to CSV / JSON
      </button>
    </div>
  );
}
