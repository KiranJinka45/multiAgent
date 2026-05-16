import chalk from 'chalk';

export interface RawMetrics {
    determinismRate: number;
    driftFrequency: number;
    auditDepth: number;
    operationalEfficiency: number;
}

export function analyzeStability(metrics: RawMetrics) {
    const { determinismRate, driftFrequency, auditDepth, operationalEfficiency } = metrics;
    
    // Logic to calculate a "Survivability Grade"
    let grade = 'A';
    if (determinismRate < 0.95 || driftFrequency > 0.05) grade = 'B';
    if (determinismRate < 0.90 || driftFrequency > 0.10) grade = 'C';
    if (determinismRate < 0.80) grade = 'D';
    if (auditDepth > 50) grade = 'B'; // Complexity penalty

    const riskStatus = determinismRate > 0.98 ? chalk.green('LOW') : (determinismRate > 0.95 ? chalk.yellow('MODERATE') : chalk.red('HIGH'));

    return {
        grade,
        riskStatus,
        efficiencyScore: (operationalEfficiency * 100).toFixed(1),
        summary: `Platform is operating with ${grade} grade survivability. Risk is ${riskStatus}.`
    };
}
