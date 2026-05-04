import { startCollaborationServer } from '../apps/api/src/services/yjs-server';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const port = 3011;
console.log('🚀 Starting Standalone Yjs Server...');
startCollaborationServer(port);

// Keep alive
process.stdin.resume();

