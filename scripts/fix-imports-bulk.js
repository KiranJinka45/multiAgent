"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const rootDir = 'C:\\multiAgentic_system\\MultiAgent';
const agents = [
    'backend-agent', 'base-agent', 'chat-edit-agent', 'coder-agent',
    'customizer-agent', 'database-agent', 'debug-agent', 'deployment-agent',
    'frontend-agent', 'intent-agent', 'meta-agent', 'planner-agent',
    'repair-agent', 'testing-agent', 'validator-agent'
];
function walkDir(dir, callback) {
    fs_1.default.readdirSync(dir).forEach(f => {
        let dirPath = path_1.default.join(dir, f);
        let isDirectory = fs_1.default.statSync(dirPath).isDirectory();
        if (isDirectory) {
            if (f !== 'node_modules' && f !== '.next' && f !== '.git') {
                walkDir(dirPath, callback);
            }
        }
        else {
            callback(path_1.default.join(dir, f));
        }
    });
}
walkDir(rootDir, (filePath) => {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.js'))
        return;
    let content = fs_1.default.readFileSync(filePath, 'utf8');
    let original = content;
    // 1. Replace @config/ with @config/
    content = content.replace(/@configs\//g, '@config/');
    // 2. Replace agent imports from @services/ to @agents/
    agents.forEach(agent => {
        const regex = new RegExp(`@services/${agent}`, 'g');
        content = content.replace(regex, `@agents/${agent}`);
    });
    if (content !== original) {
        console.log(`Updating imports in ${filePath}`);
        fs_1.default.writeFileSync(filePath, content, 'utf8');
    }
});
//# sourceMappingURL=fix-imports-bulk.js.map