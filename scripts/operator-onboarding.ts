import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * ZTAN ENVIRONMENT BOOTSTRAPPER
 * Automates the creation of a local .env file from the template and generates secure random secrets.
 */

const TEMPLATE_PATH = path.join(process.cwd(), '.env.template');
const TARGET_PATH = path.join(process.cwd(), '.env');

function bootstrap() {
    console.log('🚀 Bootstrapping ZTAN Operational Environment...');

    if (!fs.existsSync(TEMPLATE_PATH)) {
        console.error('❌ ERROR: .env.template not found. Ensure you are in the project root.');
        process.exit(1);
    }

    if (fs.existsSync(TARGET_PATH)) {
        console.warn('⚠️  WARNING: .env already exists. Skipping bootstrap to prevent overwriting secrets.');
        return;
    }

    let content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

    // Generate secure random secrets for sensitive fields
    const jwtSecret = crypto.randomBytes(32).toString('hex');
    content = content.replace('super-secret-jwt-key-replace-in-prod', jwtSecret);

    fs.writeFileSync(TARGET_PATH, content);
    console.log('✅ SUCCESS: .env created from template with generated secrets.');
    console.log('👉 ACTION: Review .env and adjust infrastructure ports if necessary.');
}

bootstrap();
