'use client';

import { useState } from 'react';
import { Users, Mail, Shield, Trash2, UserPlus, Search, ListFilter, Activity } from 'lucide-react';
import AuditLogViewer from '@/components/enterprise/AuditLogViewer';

const MEMBERS = [
  { name: 'Sarah Connor', email: 'sarah@acme.com', role: 'ADMIN', status: 'Active' },
  { name: 'Kyle Reese', email: 'kyle@acme.com', role: 'DEV', status: 'Active' },
  { name: 'John Connor', email: 'john@acme.com', role: 'VIEWER', status: 'Pending' },
];

export default function OrgSettings() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState<'members' | 'audit'>('members');

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tighter text-white">Team Management</h1>
          <p className="text-sm text-gray-500 font-medium">Manage members and roles for Acme Corp organization.</p>
        </div>
        <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-black text-xs flex items-center gap-2 hover:opacity-90 transition-all">
          <UserPlus size={16} />
          Invite Member
        </button>
      </div>

      <div className="flex items-center gap-6 border-b border-white/5 pb-1">
        <button 
          onClick={() => setTab('members')}
          className={`pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${tab === 'members' ? 'border-primary text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          Members
        </button>
        <button 
          onClick={() => setTab('audit')}
          className={`pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${tab === 'audit' ? 'border-primary text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          Audit Logs
        </button>
      </div>

      {tab === 'members' ? (
        <>
          <div className="flex items-center gap-4 bg-[#1e1e1e] border border-white/5 p-4 rounded-2xl">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/20 border border-white/5 rounded-xl pl-12 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-all font-medium"
              />
            </div>
            <button className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-500 hover:text-white transition-all">
              <ListFilter size={18} />
            </button>
          </div>

          <div className="border border-white/5 rounded-3xl overflow-hidden bg-[#18181B]">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-gray-500">Member</th>
                  <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-gray-500">Role</th>
                  <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-gray-500">Status</th>
                  <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {MEMBERS.map((m, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase">
                          {m.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-bold text-white">{m.name}</div>
                          <div className="text-xs text-gray-500">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${m.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-500' : 'bg-gray-500/10 text-gray-500'}`}>
                        <Shield size={10} />
                        {m.role}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                       <span className={`text-[10px] font-bold ${m.status === 'Active' ? 'text-green-500' : 'text-amber-500'}`}>
                         {m.status}
                       </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button className="p-2 text-gray-600 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="bg-[#18181B] border border-white/5 rounded-3xl p-8">
           <AuditLogViewer />
        </div>
      )}
    </div>
  );
}
