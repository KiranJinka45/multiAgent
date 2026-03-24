import fs from 'fs';
import path from 'path';

const rootDir = 'C:\\multiAgentic_system\\MultiAgent';
const agents = [
    'backend-agent', 'base-agent', 'chat-edit-agent', 'coder-agent',
    'customizer-agent', 'database-agent', 'debug-agent', 'deployment-agent',
    'frontend-agent', 'intent-agent', 'meta-agent', 'planner-agent',
    'repair-agent', 'testing-agent', 'validator-agent'
];

function walkDir(dir: string, callback: (filePath: string) => void) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            if (f !== 'node_modules' && f !== '.next' && f !== '.git') {
                walkDir(dirPath, callback);
            }
        } else {
            callback(path.join(dir, f));
        }
    });
}

walkDir(rootDir, (filePath) => {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.js') && !filePath.endsWith('.json')) return;
    if (filePath.includes('node_modules') || filePath.includes('.next') || filePath.includes('.git')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Replace @config/ with @config/
    content = content.replace(/@configs\//g, '@config/');

    // 2. Replace @libs/runtime/ with @libs/runtime/
    content = content.replace(/@services\/runtime\//g, '@libs/runtime/');

    // 3. Replace agent imports from @services/ to @agents/
    agents.forEach(agent => {
        const regex = new RegExp(`@services/${agent}`, 'g');
        content = content.replace(regex, `@agents/${agent}`);
    });

    // 4. Replace @/ with @/
    content = content.replace(/@\/src\//g, '@/');

    // 5. Root-level relative paths (many were src-relative)
    content = content.replace(/from '.\/src\//g, "from './");
    content = content.replace(/from "..\/src\//g, "from '../");
    content = content.replace(/from "..\/\.\.\/src\//g, "from '../../");
    content = content.replace(/import {([^}]+)} from '..\/src\//g, "import {$1} from '../");

    // 6. Fix fs-extra default export
    content = content.replace(/import * as fs from 'fs-extra'/g, "import * as fs from 'fs-extra'");

    // 7. Fix specific broken paths in workers
    content = content.replace(/..\/src\/lib\/queue\/agent-queues/g, "../lib/queue/agent-queues");

    if (content !== original) {
        console.log(`Updating imports in ${path.relative(rootDir, filePath)}`);
        fs.writeFileSync(filePath, content, 'utf8');
    }
});
