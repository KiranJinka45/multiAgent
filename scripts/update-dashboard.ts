import fs from 'fs';

interface StewardshipMetrics {
    last_updated: string;
    operational_signal_quality: {
        alert_noise_reduction: string;
    };
    maintenance_burden: {
        weekly_maintenance_hours: number;
    };
    human_ops: {
        operational_anxiety_level: string;
    };
    longitudinal_validation: {
        observation_period_days: number;
        recovery_consistency_score: number;
        operational_drift_resilience: number;
    };
    simplification_entropy: {
        entropy_level: number;
    };
    recent_incident?: {
        id: string;
        timeline: Array<{ time: string, event: string, type: string }>;
    };
}

function updateDashboard() {
    if (!fs.existsSync('data/stewardship_metrics.json')) return;
    const metrics: StewardshipMetrics = JSON.parse(fs.readFileSync('data/stewardship_metrics.json', 'utf-8'));
    
    let html = fs.readFileSync('DASHBOARD.html', 'utf-8');
    
    // Update Longitudinal Trust Stat
    html = html.replace(/<div class="stat">[\d%]+<\/div>\n\s+<div class="stat-sub">Recovery consistency \(180 days\)/, `<div class="stat">${(metrics.longitudinal_validation.recovery_consistency_score * 100).toFixed(0)}%</div>\n            <div class="stat-sub">Recovery consistency (${metrics.longitudinal_validation.observation_period_days} days)`);
    
    // Update Drift Resilience Stat
    html = html.replace(/<div class="stat">[\d.]+<\/div>\n\s+<div class="stat-sub">Operational entropy resistance/, `<div class="stat">${metrics.longitudinal_validation.operational_drift_resilience.toFixed(3)}</div>\n            <div class="stat-sub">Operational entropy resistance`);
    
    // Update Stewardship Stats
    html = html.replace(/Entropy Level: <span style="color: var\(--success\);">LOW \([\d.]+\)<\/span>/, `Entropy Level: <span style="color: var(--success);">LOW (${metrics.simplification_entropy.entropy_level.toFixed(5)})</span>`);
    html = html.replace(/Alert Noise Reduction: <span style="color: var\(--success\);">[\d%]+<\/span>/, `Alert Noise Reduction: <span style="color: var(--success);">${metrics.operational_signal_quality.alert_noise_reduction}</span>`);
    
    // Update Incident ID
    if (metrics.recent_incident) {
        html = html.replace(/\/\/ Incident ID: ZTAN-.*? \/\/ Mode: AUTO-RECOVERY/, `// Incident ID: ${metrics.recent_incident.id} // Mode: AUTO-RECOVERY`);
        
        // Update Replay Events
        let eventHtml = '';
        metrics.recent_incident.timeline.forEach(e => {
            const color = e.type === 'warning' ? 'warning' : (e.type === 'accent' ? 'accent' : 'success');
            eventHtml += `                <span style="color: var(--${color});">[${e.time}]</span> ${e.event}<br>\n`;
        });
        html = html.replace(/<div style="margin: 0.5rem 0;" id="replay-events">[\s\S]*?<\/div>/, `<div style="margin: 0.5rem 0;" id="replay-events">\n${eventHtml}            </div>`);
    }

    // Update Cycle Time
    html = html.replace(/<span id="last-cycle-time">.*?<\/span>/, `<span id="last-cycle-time">${metrics.last_updated.split('T')[0]}</span>`);

    fs.writeFileSync('DASHBOARD.html', html);
    console.log('✅ DASHBOARD.html updated with Longitudinal Reality & Drift metrics.');
}

updateDashboard();
