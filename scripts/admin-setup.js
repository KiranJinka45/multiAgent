"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// scripts/admin-setup.ts
const db_1 = require("@packages/db");
const dotenv = __importStar(require("dotenv"));
// Load environment variables from .env.local or .env
dotenv.config({ path: '.env.local' });
dotenv.config();
const prisma = new db_1.PrismaClient();
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
    }
    catch (e) {
        console.error(`❌ [ADMIN SETUP] Failed to find user ${ADMIN_EMAIL}. Make sure they have logged in once.`);
        // Strategy B: If first specific user fails, list all users to help identification
        const allUsers = await prisma.user.findMany({ take: 5 });
        if (allUsers.length > 0) {
            console.log('💡 [HINT] Found these users in DB:', allUsers.map(u => u.email).join(', '));
        }
        else {
            console.log('💡 [HINT] The User table is currently empty.');
        }
    }
    finally {
        await prisma.$disconnect();
    }
}
main().catch(console.error);
//# sourceMappingURL=admin-setup.js.map