import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
console.log(`[PRE-INIT] Env loaded. REDIS_URL=${process.env.REDIS_URL}`);

