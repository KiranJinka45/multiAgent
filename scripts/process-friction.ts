import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';

/**
 * ZTAN FRICTION PROCESSOR
 * 
 * Aggregates individual operator friction reports into a central summary
 * to drive subtractive engineering and documentation hardening.
 */

interface FrictionReport {
    timestamp: string;
    operator: string;
    feedback: string;
    context: {
        cwd: string;
        node: string;
        platform: string;
    };
}

const FRICTION_DIR = path.join(process.cwd(), 'docs/friction');
const REPORT_FILE = path.join(process.cwd(), 'OPERATOR_FRICTION_REPORT.md');

async function processFriction() {
    console.log(chalk.yellow.bold('\n⚠️  PROCESSING OPERATOR FRICTION REPORTS...'));

    if (!fs.existsSync(FRICTION_DIR)) {
        console.log(chalk.gray('No friction reports found. (Good sign!)'));
        return;
    }

    const files = fs.readdirSync(FRICTION_DIR).filter(f => f.endsWith('.json'));
    const reports: FrictionReport[] = [];

    files.forEach(file => {
        try {
            const data = fs.readFileSync(path.join(FRICTION_DIR, file), 'utf8');
            reports.push(JSON.parse(data));
        } catch (err) {
            console.error(chalk.red(`Failed to parse ${file}:`), err);
        }
    });

    if (reports.length === 0) {
        console.log(chalk.green('No valid friction reports identified.'));
        return;
    }

    // Sort by timestamp
    reports.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Generate Markdown
    let md = `# Operator Friction Report\n\n`;
    md += `*Generated on: ${new Date().toISOString()}*\n\n`;
    md += `## Executive Summary\n\n`;
    md += `- Total Reports: **${reports.length}**\n`;
    md += `- Unique Operators: **${new Set(reports.map(r => r.operator)).size}**\n\n`;

    md += `## Detailed Logs\n\n`;
    md += `| Timestamp | Operator | Feedback | Platform |\n`;
    md += `|---|---|---|---|\n`;
    
    reports.forEach(r => {
        md += `| ${r.timestamp} | ${r.operator} | ${r.feedback} | ${r.context.platform} |\n`;
    });

    md += `\n## Heatmap / Common Confusion Points\n\n`;
    md += `[Add manual audit notes here after reviewing the logs above]\n`;

    fs.writeFileSync(REPORT_FILE, md);
    console.log(chalk.green(`✅ Aggregated report generated: ${REPORT_FILE}`));
}

processFriction().catch(err => {
    console.error(chalk.red('\n❌ Processor crashed:'), err);
    process.exit(1);
});
