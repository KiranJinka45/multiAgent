import { History, CheckCircle2, XCircle, RotateCcw, Activity } from 'lucide-react';

interface AuditEvent {
    id: string;
    action: string;
    resource: string;
    status: 'SUCCESS' | 'FAILURE' | 'IN_PROGRESS' | 'ROLLED_BACK';
    timestamp: string;
    reason: string;
}

const EVENTS: AuditEvent[] = [
    { id: '1', action: 'K8S_ROLLOUT', resource: 'auth-api', status: 'SUCCESS', timestamp: '2 mins ago', reason: 'Security Patch v1.2.4' },
    { id: '2', action: 'INFRA_APPLY', resource: 'terraform/aws-us-east', status: 'FAILURE', timestamp: '15 mins ago', reason: 'Resource Quota Exceeded' },
    { id: '3', action: 'ROLLBACK', resource: 'terraform/aws-us-east', status: 'ROLLED_BACK', timestamp: '14 mins ago', reason: 'Automatic Auto-Recovery' },
    { id: '4', action: 'RECONCILE', resource: 'k8s:default/nginx', status: 'SUCCESS', timestamp: '1 hour ago', reason: 'Drift Repair' },
];

const AuditTimeline = () => {
    return (
        <div className="glass-panel h-full overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <History className="text-blue-500" />
                    <h3 className="font-semibold uppercase tracking-tight text-sm">Evidence Timeline</h3>
                </div>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-bold">LIVE LEDGER</span>
            </div>

            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                {EVENTS.map((event) => (
                    <div key={event.id} className="relative pl-8 border-l border-white/5 pb-2">
                        <div className="absolute -left-[9px] top-0">
                            {event.status === 'SUCCESS' && <CheckCircle2 size={18} className="text-green-500 bg-black rounded-full" />}
                            {event.status === 'FAILURE' && <XCircle size={18} className="text-red-500 bg-black rounded-full" />}
                            {event.status === 'ROLLED_BACK' && <RotateCcw size={18} className="text-amber-500 bg-black rounded-full" />}
                            {event.status === 'IN_PROGRESS' && <Activity size={18} className="text-blue-500 animate-spin bg-black rounded-full" />}
                        </div>
                        
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-mono font-bold text-white/80">{event.action}</span>
                                <span className="text-[10px] text-slate-500">{event.timestamp}</span>
                            </div>
                            <div className="text-[11px] text-blue-400 font-mono">{event.resource}</div>
                            <div className="text-[11px] text-slate-500 mt-1 italic">"{event.reason}"</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AuditTimeline;
