import fs from 'fs';

interface Metrics {
    totalTests: number;
    successfulRecoveries: number;
    failedRecoveries: number;
    lastTestTimestamp: string | null;
    trustScore: number;
    history: any[];
}

function generateReport() {
    if (!fs.existsSync('METRICS.json')) {
        console.error('No metrics found.');
        return;
    }

    const metrics: Metrics = JSON.parse(fs.readFileSync('METRICS.json', 'utf-8'));
    
    let report = `# Nexus ZTAN — Failure Hardening & Continuous Validation Report\n`;
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Trust Score**: ${(metrics.trustScore * 100).toFixed(2)}%\n\n`;
    
    report += `## Summary Statistics\n`;
    report += `- **Total Validation Cycles**: ${metrics.totalTests}\n`;
    report += `- **Successful Recoveries**: ${metrics.successfulRecoveries}\n`;
    report += `- **Failed Recoveries**: ${metrics.failedRecoveries}\n`;
    report += `- **Last Operational Test**: ${metrics.lastTestTimestamp}\n\n`;
    
    report += `## Longitudinal History\n`;
    report += `| Timestamp | Type | Result |\n`;
    report += `| :--- | :--- | :--- |\n`;
    
    metrics.history.slice(-20).reverse().forEach(h => {
        report += `| ${h.timestamp} | ${h.type} | ${h.success ? '✅ SUCCESS' : '❌ FAILURE'} |\n`;
    });
    
    report += `\n## Operational Insights\n`;
    if (metrics.trustScore >= 0.95) {
        report += `> [!TIP]\n`;
        report += `> System remains within the **High-Confidence** operational boundary. No immediate hardening actions required.\n`;
    } else {
        report += `> [!WARNING]\n`;
        report += `> System trust score dropped below 95%. Immediate investigation of recent recovery failures recommended.\n`;
    }

    fs.writeFileSync('FAILURE_HARDENING_REPORT.md', report);
    console.log('✅ FAILURE_HARDENING_REPORT.md generated.');
}

generateReport();
