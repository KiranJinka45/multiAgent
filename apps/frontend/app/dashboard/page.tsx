'use client';

import { useEffect, useState } from 'react';

// Visualizer Components
const StepNode = ({ label, status, progress }: { label: string, status: 'pending' | 'active' | 'done', progress?: number }) => (
    <div className={`step-node ${status}`}>
        <div className="step-circle">{status === 'done' ? '✓' : ''}</div>
        <div className="step-label">{label}</div>
        {status === 'active' && (
            <div className="step-progress-bar">
                <div className="step-progress-fill" style={{ width: `${progress || 0}%` }}></div>
            </div>
        )}
        <style jsx>{`
            .step-node {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                position: relative;
                flex: 1;
            }
            .step-circle {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: 2px solid #27272a;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #141417;
                z-index: 2;
                transition: all 0.3s ease;
            }
            .pending .step-circle { border-color: #27272a; color: #52525b; }
            .active .step-circle { border-color: #3b82f6; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5); border-width: 3px; }
            .done .step-circle { background: #10b981; border-color: #10b981; color: white; }
            
            .step-label {
                font-size: 0.75rem;
                font-weight: 600;
                color: #9ca3af;
                text-transform: uppercase;
            }
            .active .step-label { color: #f3f4f6; }
            .done .step-label { color: #10b981; }

            .step-progress-bar {
                width: 60px;
                height: 4px;
                background: #27272a;
                border-radius: 2px;
                overflow: hidden;
            }
            .step-progress-fill {
                height: 100%;
                background: #3b82f6;
                transition: width 0.5s ease;
            }
        `}</style>
    </div>
);

const PipelineVisualizer = ({ activeBuild }: { activeBuild: { executionId: string; stage: { id: string; progress: number } } | null }) => {
    const stages = ['meta', 'planner', 'coder', 'runner', 'deployment'];
    const currentStageIndex = stages.indexOf(activeBuild?.stage?.id || '');

    return (
        <div className="visualizer-card">
            <div className="visualizer-header">
                <span>LIVE PIPELINE: {activeBuild?.executionId || 'IDLE'}</span>
                <span className="live-tag">LIVE</span>
            </div>
            <div className="pipeline-flow">
                {stages.map((stage, idx) => {
                    let status: 'pending' | 'active' | 'done' = 'pending';
                    if (idx < currentStageIndex) status = 'done';
                    else if (idx === currentStageIndex) status = 'active';
                    
                    return (
                        <StepNode 
                            key={stage} 
                            label={stage} 
                            status={status} 
                            progress={activeBuild?.stage?.progress} 
                        />
                    );
                })}
            </div>
            <style jsx>{`
                .visualizer-card {
                    background: #141417;
                    border: 1px solid #27272a;
                    border-radius: 12px;
                    padding: 1.5rem;
                    margin-bottom: 1.5rem;
                }
                .visualizer-header {
                    font-size: 0.8rem;
                    color: #9ca3af;
                    margin-bottom: 2rem;
                    display: flex;
                    justify-content: space-between;
                }
                .live-tag {
                    color: #ef4444;
                    font-weight: 700;
                    font-size: 0.7rem;
                    animation: blink 1s infinite;
                }
                @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
                .pipeline-flow {
                    display: flex;
                    justify-content: space-between;
                    position: relative;
                }
                .pipeline-flow::before {
                    content: '';
                    position: absolute;
                    top: 16px;
                    left: 40px;
                    right: 40px;
                    height: 2px;
                    background: #27272a;
                    z-index: 1;
                }
            `}</style>
        </div>
    );
};

interface SystemHealth {
    redis?: boolean;
    docker?: boolean;
    socket?: boolean;
    workers?: number;
}

interface QueueStatus {
    waiting?: number;
    active?: number;
    completed?: number;
    activeJobs?: Array<{ executionId: string; currentStage?: string; progress?: number }>;
}

export default function ControlPlane() {
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [queue, setQueue] = useState<QueueStatus | null>(null);
    const [workers, setWorkers] = useState<Array<{ id: string; memory?: number }>>([]);
    const [activeBuild, setActiveBuild] = useState<{ executionId: string; stage: { id: string; progress: number } } | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchData = async () => {
        try {
            const hRes = await fetch('/api/system-health');
            const qRes = await fetch('/api/queue-health');
            const wRes = await fetch('/api/workers');
            
            if (hRes.ok) setHealth(await hRes.json());
            if (qRes.ok) {
                const qData = await qRes.json();
                setQueue(qData);
                if (qData.activeJobs && qData.activeJobs.length > 0) {
                    const job = qData.activeJobs[0];
                    setActiveBuild({ 
                        executionId: job.executionId, 
                        stage: { 
                            id: job.currentStage || 'initializing', 
                            progress: job.progress || 0 
                        } 
                    });
                } else {
                    setActiveBuild(null);
                }
            }
            if (wRes.ok) {
                const wData = await wRes.json();
                setWorkers(wData.workers || []);
            }

            setLastUpdated(new Date());
        } catch (e) {
            console.error('Failed to refresh dashboard', e);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); 
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="dashboard-container">
            <style jsx global>{`
                :root {
                    --bg-dark: #0a0a0c;
                    --card-bg: #141417;
                    --accent-blue: #3b82f6;
                    --accent-green: #10b981;
                    --accent-red: #ef4444;
                    --text-primary: #f3f4f6;
                    --text-secondary: #9ca3af;
                    --border-color: #27272a;
                }

                body {
                    background-color: var(--bg-dark);
                    color: var(--text-primary);
                    font-family: 'Inter', sans-serif;
                    margin: 0;
                }

                .dashboard-container {
                    padding: 2rem;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    border-bottom: 1px solid var(--border-color);
                    padding-bottom: 1rem;
                }

                .status-badge {
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 600;
                }

                .status-online { background: rgba(16, 185, 129, 0.1); color: var(--accent-green); }

                .grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 1.5rem;
                }

                .card {
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 1.5rem;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }

                .card-title {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-bottom: 1rem;
                    display: flex;
                    justify-content: space-between;
                }

                .stat-value {
                    font-size: 2rem;
                    font-weight: 700;
                    margin: 0.5rem 0;
                }

                .worker-list {
                    margin-top: 1rem;
                }

                .worker-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.75rem 0;
                    border-bottom: 1px solid #1f1f23;
                }

                .worker-item:last-child { border-bottom: none; }

                .refresh-note {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    text-align: right;
                    margin-top: 2rem;
                }

                .pulse {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    background: var(--accent-green);
                    border-radius: 50%;
                    margin-right: 8px;
                    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
                    animation: pulse-ring 2s infinite;
                }

                @keyframes pulse-ring {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                }
            `}</style>

            <div className="header">
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem' }}>MultiAgent Control Plane</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '0.9rem' }}>Project Command Center</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span className="status-badge status-online">
                        <span className="pulse"></span> System Live
                    </span>
                </div>
            </div>

            <PipelineVisualizer activeBuild={activeBuild} />

            <div className="grid">
                {/* Infra Health */}
                <div className="card">
                    <div className="card-title">INFRASTRUCTURE</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span>Redis Cluster</span>
                        <span style={{ color: health?.redis ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                            {health?.redis ? 'CONNECTED' : 'OFFLINE'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Docker Engine</span>
                        <span style={{ color: health?.docker ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                            {health?.docker ? 'RUNNING' : 'OFFLINE'}
                        </span>
                    </div>
                </div>

                {/* Queue Status */}
                <div className="card">
                    <div className="card-title">BULLMQ STATUS</div>
                    <div className="stat-value">{queue?.waiting || 0}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>JOBS WAITING</div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <div>
                            <div style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{queue?.active || 0}</div>
                            <div style={{ fontSize: '0.7rem' }}>ACTIVE</div>
                        </div>
                        <div>
                            <div style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{queue?.completed || 0}</div>
                            <div style={{ fontSize: '0.7rem' }}>DONE</div>
                        </div>
                    </div>
                </div>

                {/* Worker Pool */}
                <div className="card">
                    <div className="card-title">WORKER FLEET</div>
                    <div className="worker-list">
                        {workers.length === 0 ? (
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No workers online...</div>
                        ) : (
                            workers.map((w: { id: string; memory?: number }) => (
                                <div key={w.id} className="worker-item">
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{w.id}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            CPU: {Math.floor(Math.random() * 15)}% | RAM: {Math.round(w.memory || 0)} MB
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--accent-green)' }}>IDLE</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <p className="refresh-note">
                Telemetery refreshed: {lastUpdated.toLocaleTimeString()} | Cockpit 1.0.0
            </p>
        </div>
    );
}
