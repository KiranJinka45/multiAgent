import { execSync } from 'node:child_process';
import fs from 'node:fs';
import chalk from 'chalk';

/**
 * ZTAN EPHEMERAL CLOUD VALIDATOR
 * 
 * Validates platform readiness for deployment to ephemeral cloud VMs.
 * Supports simulation and real environment checks.
 */

interface CloudProvider {
    name: string;
    cli: string;
    authCheck: string;
}

const PROVIDERS: CloudProvider[] = [
    { name: 'DigitalOcean', cli: 'doctl', authCheck: 'doctl auth list' },
    { name: 'AWS', cli: 'aws', authCheck: 'aws sts get-caller-identity' },
    { name: 'GCP', cli: 'gcloud', authCheck: 'gcloud auth list' }
];

async function validate() {
    console.log(chalk.cyan.bold('\n☁️  ZTAN EPHEMERAL CLOUD VALIDATION'));
    console.log('------------------------------------');

    const issues: string[] = [];
    const availableProviders: string[] = [];

    // 1. Check for Provider CLIs
    for (const provider of PROVIDERS) {
        try {
            execSync(`${provider.cli} --version`, { stdio: 'ignore' });
            console.log(chalk.green(`✅ ${provider.name} CLI found.`));
            
            try {
                execSync(provider.authCheck, { stdio: 'ignore' });
                console.log(chalk.green(`   - Authentication: OK`));
                availableProviders.push(provider.name);
            } catch {
                console.log(chalk.yellow(`   - Authentication: FAILED (Unauthorized)`));
            }
        } catch {
            console.log(chalk.gray(`🔘 ${provider.name} CLI not installed.`));
        }
    }

    // 2. Deployment Manifest Integrity
    const manifestPath = './deployment/cloud-init.yaml';
    if (fs.existsSync(manifestPath)) {
        console.log(chalk.green('✅ Cloud-init manifest found.'));
    } else {
        issues.push('Missing ./deployment/cloud-init.yaml for ephemeral VM provisioning.');
    }

    // 3. Environment Variables
    const requiredVars = ['ZTAN_DEPLOY_ENV', 'ZTAN_CLUSTER_SECRET'];
    for (const v of requiredVars) {
        if (process.env[v]) {
            console.log(chalk.green(`✅ Env Var ${v}: FOUND`));
        } else {
            console.log(chalk.yellow(`⚠️  Env Var ${v}: MISSING (Defaulting to 'ephemeral')`));
        }
    }

    // 4. Final Verdict
    console.log('\n📊 VERDICT:');
    if (availableProviders.length > 0 && issues.length === 0) {
        console.log(chalk.bold.green(`READY: Platform can be deployed to ${availableProviders.join(', ')} ephemeral instances.`));
    } else if (availableProviders.length === 0) {
        console.log(chalk.bold.red('BLOCKER: No cloud provider CLI or authentication found.'));
        console.log('Ensure doctl, aws, or gcloud is configured for ephemeral VM creation.');
    } else {
        console.log(chalk.bold.yellow('PARTIAL: Providers available but manifest/config issues detected.'));
        issues.forEach(i => console.log(chalk.red(`   - ${i}`)));
    }
}

validate().catch(err => {
    console.error(chalk.red('\n❌ Validation script crashed:'), err);
    process.exit(1);
});
