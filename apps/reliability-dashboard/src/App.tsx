import { useState, useEffect } from 'react'
import { Shield, Activity, Database, AlertCircle, BarChart3 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import InfraGraph from './components/InfraGraph';
import AuditTimeline from './components/AuditTimeline';

const RELIABILITY_DATA = [
  { time: '00:00', score: 98 },
  { time: '04:00', score: 97 },
  { time: '08:00', score: 99 },
  { time: '12:00', score: 92 },
  { time: '16:00', score: 98 },
  { time: '20:00', score: 99 },
];

const App = () => {
  const [data, setData] = useState<any>(null);
  const [activeBlastNode, setActiveBlastNode] = useState<string | undefined>(undefined);

  useEffect(() => {
    setData({
      grade: 'A',
      score: 98.4,
      riskStatus: 'LOW',
      efficiencyScore: '82.0',
      trend: 'UPWARD',
      activeIncidents: 0,
      recoverySuccessRate: 100
    });
  }, []);

  if (!data) return <div className="p-10 text-center text-blue-500 font-mono animate-pulse">Initializing Institutional Control Plane...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="px-8 py-6 border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Shield className="text-blue-500 w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">NEXUS ZTAN</h1>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Governed Autonomous Substrate</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-8 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                <span>UPTIME: 99.999%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                <span>EPOCH: 1024.A</span>
              </div>
            </div>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-blue-600/20">
              ZTANCTL TERMINAL
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-8 grid grid-cols-12 gap-6">
        
        {/* Left Column: Metrics & Graph */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* Main Stats Row */}
          <div className="grid grid-cols-3 gap-6">
            <div className="glass-panel col-span-2 flex justify-between items-center bg-gradient-to-br from-white/[0.03] to-transparent">
              <div>
                <h2 className="stat-label mb-2">Survivability Index</h2>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-bold tracking-tighter text-white">{data.score}%</span>
                  <span className="text-xs font-bold text-green-500 uppercase tracking-widest">Stable</span>
                </div>
                <div className="mt-6 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-[98.4%] shadow-[0_0_12px_rgba(59,130,246,0.4)]" />
                </div>
              </div>
              <div className="text-center pl-8 border-l border-white/5">
                <div className="w-20 h-20 rounded-full border-4 border-blue-500/20 flex items-center justify-center relative">
                    <span className="text-3xl font-black text-blue-500">{data.grade}</span>
                    <div className="absolute inset-0 rounded-full border-t-4 border-blue-500 animate-spin-slow" />
                </div>
              </div>
            </div>

            <div className="glass-panel flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <h2 className="stat-label">Active Incidents</h2>
                <Activity size={16} className="text-slate-500" />
              </div>
              <div className="text-4xl font-bold text-white">{data.activeIncidents}</div>
              <div className="text-[10px] text-green-500 font-bold uppercase tracking-widest">All Clear</div>
            </div>
          </div>

          {/* Infrastructure Graph Section */}
          <div className="glass-panel p-0 overflow-hidden relative group">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
               <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Infrastructure Topology & Blast Radius</h3>
               <div className="flex gap-2">
                 {['gw', 'auth', 'core'].map(node => (
                   <button 
                    key={node}
                    onClick={() => setActiveBlastNode(activeBlastNode === node ? undefined : node)}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${activeBlastNode === node ? 'bg-red-500 text-white' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
                   >
                     Simulate {node} failure
                   </button>
                 ))}
               </div>
            </div>
            <InfraGraph blastRadiusNode={activeBlastNode} />
          </div>

          {/* Historical Reliability Chart */}
          <div className="glass-panel h-[300px]">
            <div className="flex items-center gap-2 mb-6">
                <BarChart3 size={16} className="text-purple-500" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">24H Reliability Drift</h3>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={RELIABILITY_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis domain={[80, 100]} stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#3b82f6' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6, stroke: '#fff' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right Column: Evidence & Governance */}
        <div className="col-span-12 lg:col-span-4 space-y-6 h-full">
          
          <AuditTimeline />

          {/* Governance Logic */}
          <div className="glass-panel">
            <div className="flex items-center gap-2 mb-6">
              <Database className="text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-tight">Trust Calibration</h3>
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex justify-between items-center mb-2">
                   <span className="text-[10px] font-bold text-slate-500 uppercase">Recovery Confidence</span>
                   <span className="text-xs font-mono text-blue-400">99.8%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[99.8%]" />
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex justify-between items-center mb-2">
                   <span className="text-[10px] font-bold text-slate-500 uppercase">Replay Fidelity</span>
                   <span className="text-xs font-mono text-purple-400">100%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 w-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Prediction Alert */}
          <div className="glass-panel border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-amber-500 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">Predictive Recovery Alert</h4>
                <p className="text-[11px] text-amber-500/70 mt-1 leading-relaxed">
                  Historical pattern suggests potential latency drift in <strong>auth-api</strong> cluster within 4 hours. Automated health-check rotation scheduled.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      <footer className="p-12 text-center text-slate-600 text-[10px] font-mono uppercase tracking-[0.2em]">
        ZTAN CONTROL PLANE • SOVEREIGN STABLE • REPLAYABLE INFRASTRUCTURE • &copy; 2026
      </footer>
    </div>
  )
}

export default App
