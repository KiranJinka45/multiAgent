// scripts/admin-setup.ts
import { PrismaClient } from '@packages/db';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local or .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

// Support command-line argument for email, fallback to hardcoded default
const emailArg = process.argv.find(arg => arg.startsWith('--email='));
const ADMIN_EMAIL = emailArg ? emailArg.split('=')[1] : 'kiranjinkakumar@gmail.com';

async function main() {
    console.log(`🛡️  [ADMIN SETUP] Elevating ${ADMIN_EMAIL} to ADMIN...`);
    
    try {
        const user = await prisma.user.update({
            where: { email: ADMIN_EMAIL },
            data: { role: 'ADMIN' }
        });
        
        console.log(`✅ [ADMIN SETUP] User ${user.email} is now an ${user.role}.`);
    } catch (e) {
        console.error(`❌ [ADMIN SETUP] Failed to find user ${ADMIN_EMAIL}. Make sure they have logged in once.`);
        
        // Strategy B: If first specific user fails, list all users to help identification
        const allUsers = await prisma.user.findMany({ take: 5 });
        if (allUsers.length > 0) {
            console.log('💡 [HINT] Found these users in DB:', allUsers.map(u => u.email).join(', '));
        } else {
            console.log('💡 [HINT] The User table is currently empty.');
        }
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);

