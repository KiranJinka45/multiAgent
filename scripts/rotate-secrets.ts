import fs from 'node:fs';
import path from 'node:path';
import { crypto } from 'node:crypto';

/**
 * ZTAN SECRET ROTATION UTILITY
 * Rotates sensitive keys and maintains a backup of the previous environment.
 */

const ENV_PATH = path.join(process.cwd(), '.env');
const BACKUP_PATH = path.join(process.cwd(), '.env.bak');

function rotate() {
    console.log('🔄 INITIATING SECRET ROTATION...');

    if (!fs.existsSync(ENV_PATH)) {
        console.error('❌ ERROR: .env file not found. Nothing to rotate.');
        process.exit(1);
    }

    // 1. Create Backup
    fs.copyFileSync(ENV_PATH, BACKUP_PATH);
    console.log(`✅ Backup created: ${BACKUP_PATH}`);

    let content = fs.readFileSync(ENV_PATH, 'utf-8');

    // 2. Rotate JWT_SECRET
    const newSecret = crypto.randomBytes(32).toString('hex');
    const jwtRegex = /^JWT_SECRET=.*$/m;
    
    if (jwtRegex.test(content)) {
        content = content.replace(jwtRegex, `JWT_SECRET=${newSecret}`);
        console.log('✅ JWT_SECRET rotated.');
    } else {
        console.warn('⚠️  JWT_SECRET not found in .env. Adding it...');
        content += `\nJWT_SECRET=${newSecret}`;
    }

    // 3. Write changes
    fs.writeFileSync(ENV_PATH, content);
    console.log('✨ ROTATION COMPLETE.');
    console.log('👉 ACTION: Restart all services to apply the new secrets.');
}

rotate();
