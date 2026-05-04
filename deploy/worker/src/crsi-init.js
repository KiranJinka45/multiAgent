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
// @ts-nocheck
const db_1 = require("@packages/db");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class CodeIndexer {
    rootDir;
    ignoreDirs = ['node_modules', '.git', 'dist', '.next', 'out'];
    constructor(rootDir) {
        this.rootDir = rootDir;
    }
    async scan() {
        console.log(`[CodeIndexer] Scanning ${this.rootDir}...`);
        await this.walk(this.rootDir);
    }
    async walk(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                if (!this.ignoreDirs.includes(file))
                    await this.walk(fullPath);
            }
            else if (file.match(/\.(ts|js|prisma|json|md)$/)) {
                await this.indexFile(fullPath);
            }
        }
    }
    async indexFile(filePath) {
        const relativePath = path.relative(this.rootDir, filePath).replace(/\\/g, '/');
        const name = path.basename(filePath);
        const content = fs.readFileSync(filePath, 'utf-8');
        let riskLevel = 'low';
        if (relativePath.includes('auth') || relativePath.includes('db') || relativePath.includes('orchestrator'))
            riskLevel = 'high';
        else if (relativePath.includes('worker') || relativePath.includes('brain'))
            riskLevel = 'medium';
        await db_1.db.codeModule.upsert({
            where: { path: relativePath },
            update: { name, summary: content.substring(0, 100), riskLevel, lastUpdated: new Date() },
            create: { path: relativePath, name, summary: content.substring(0, 100), riskLevel, lastUpdated: new Date() }
        });
    }
}
async function main() {
    const rootDir = path.resolve(__dirname, '../../../');
    const indexer = new CodeIndexer(rootDir);
    await indexer.scan();
    process.exit(0);
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=crsi-init.js.map