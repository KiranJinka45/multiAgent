import { Server, Database, Globe, ShieldAlert } from 'lucide-react';

interface Node {
    id: string;
    type: 'service' | 'db' | 'gateway';
    name: string;
    x: number;
    y: number;
}

interface Edge {
    from: string;
    to: string;
}

const NODES: Node[] = [
    { id: 'gw', type: 'gateway', name: 'Gateway', x: 50, y: 50 },
    { id: 'auth', type: 'service', name: 'Auth-API', x: 30, y: 150 },
    { id: 'core', type: 'service', name: 'Core-API', x: 70, y: 150 },
    { id: 'db1', type: 'db', name: 'Main-DB', x: 30, y: 250 },
    { id: 'db2', type: 'db', name: 'Audit-DB', x: 70, y: 250 },
];

const EDGES: Edge[] = [
    { from: 'gw', to: 'auth' },
    { from: 'gw', to: 'core' },
    { from: 'auth', to: 'db1' },
    { from: 'core', to: 'db2' },
    { from: 'core', to: 'db1' },
];

const InfraGraph = ({ blastRadiusNode }: { blastRadiusNode?: string }) => {
    return (
        <div className="relative w-full h-[400px] bg-black/40 rounded-2xl border border-white/5 overflow-hidden p-8">
            <div className="absolute top-4 left-4 flex items-center gap-2">
                <Globe size={16} className="text-blue-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Live Topology Map</span>
            </div>

            <svg className="w-full h-full" viewBox="0 0 100 300">
                {/* Edges */}
                {EDGES.map((edge, i) => {
                    const from = NODES.find(n => n.id === edge.from)!;
                    const to = NODES.find(n => n.id === edge.to)!;
                    return (
                        <line 
                            key={i}
                            x1={from.x} y1={from.y} 
                            x2={to.x} y2={to.y} 
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="1"
                        />
                    );
                })}

                {/* Nodes */}
                {NODES.map((node) => {
                    const isAffected = blastRadiusNode === node.id || (blastRadiusNode === 'gw' && node.id !== 'gw');
                    return (
                        <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                            <circle 
                                r="12" 
                                className={`${isAffected ? 'fill-red-500/20 stroke-red-500 animate-pulse' : 'fill-slate-800 stroke-slate-700'}`}
                                strokeWidth="1"
                            />
                            <foreignObject x="-8" y="-8" width="16" height="16">
                                <div className="flex items-center justify-center h-full w-full">
                                    {node.type === 'gateway' && <Globe size={10} className={isAffected ? 'text-red-500' : 'text-blue-400'} />}
                                    {node.type === 'service' && <Server size={10} className={isAffected ? 'text-red-500' : 'text-purple-400'} />}
                                    {node.type === 'db' && <Database size={10} className={isAffected ? 'text-red-500' : 'text-amber-400'} />}
                                </div>
                            </foreignObject>
                            <text 
                                y="25" 
                                textAnchor="middle" 
                                className={`text-[8px] font-bold ${isAffected ? 'fill-red-400' : 'fill-slate-400'}`}
                            >
                                {node.name}
                            </text>
                        </g>
                    );
                })}
            </svg>

            {blastRadiusNode && (
                <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                    <ShieldAlert size={14} className="text-red-500" />
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">
                        High Blast Radius: {blastRadiusNode}
                    </span>
                </div>
            )}
        </div>
    );
};

export default InfraGraph;
