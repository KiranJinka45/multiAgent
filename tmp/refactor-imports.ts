import fs from 'fs';
import path from 'path';

const searchDirs = ['services', 'workers', 'queue', 'realtime', 'configs', 'src'];

const replacements = [
    // Top-level aliases for common infrastructure
    { from: /import .* from ['"]\.\.?\/\.\.?\/lib\/redis['"]/g, to: (m: string) => m.replace(/['"]\.\.?\/\.\.?\/lib\/redis['"]/, "'@queue/redis-client'") },
    { from: /import .* from ['"]\.\.?\/\.\.?\/lib\/queue['"]/g, to: (m: string) => m.replace(/['"]\.\.?\/\.\.?\/lib\/queue['"]/, "'@queue/build-queue'") },
    { from: /import .* from ['"]\.\.?\/\.\.?\/lib\/logger['"]/g, to: (m: string) => m.replace(/['"]\.\.?\/\.\.?\/lib\/logger['"]/, "'@configs/logger'") },
    { from: /import .* from ['"]\.\.?\/\.\.?\/config\/env['"]/g, to: (m: string) => m.replace(/['"]\.\.?\/\.\.?\/config\/env['"]/, "'@configs/env'") },
    { from: /import .* from ['"]\.\.?\/\.\.?\/lib\/event-bus['"]/g, to: (m: string) => m.replace(/['"]\.\.?\/\.\.?\/lib\/event-bus['"]/, "'@realtime/event-bus'") },

    // Service-internal relative fixes (now that they are in the same folder)
    {
        from: /import .* from ['"]\.\.\/lib\/(vfs|task-engine|project-service|project-memory|execution-context|agent-memory|impact-analyzer|dependency-graph|patch-verifier|tenant-service|devops)['"]/g,
        to: (m: string) => m.replace(/['"]\.\.\/lib\/(vfs|task-engine|project-service|project-memory|execution-context|agent-memory|impact-analyzer|dependency-graph|patch-verifier|tenant-service|devops)['"]/, "'./$1'")
    },

    // Catch-all for remaining lib references
    { from: /import .* from ['"]\.\.?\/lib\/supabaseAdmin['"]/g, to: (m: string) => m.replace(/['"]\.\.?\/lib\/supabaseAdmin['"]/, "'@queue/supabase-admin'") },
    { from: /import .* from ['"]\.\.?\/lib\/metrics['"]/g, to: (m: string) => m.replace(/['"]\.\.?\/lib\/metrics['"]/, "'@configs/metrics'") },
    { from: /import .* from ['"]\.\.?\/lib\/tracing['"]/g, to: (m: string) => m.replace(/['"]\.\.?\/lib\/tracing['"]/, "'@configs/tracing'") },
    { from: /import .* from ['"]\.\.?\/lib\/opentelemetry['"]/g, to: (m: string) => m.replace(/['"]\.\.?\/lib\/opentelemetry['"]/, "'@configs/opentelemetry'") },

    // Fix agent-to-agent relative imports (now at root of services/)
    { from: /from ['"]\.\/.*-agent['"]/g, to: (m: string) => m.replace(/['"]\.\//, "'@services/") },
];

function refactorFile(filePath: string) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let changed = false;

    for (const r of replacements) {
        if (r.from.test(content)) {
            content = content.replace(r.from, r.to);
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated: ${filePath}`);
    }
}

function walk(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.next') walk(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            refactorFile(fullPath);
        }
    }
}

for (const dir of searchDirs) {
    if (fs.existsSync(dir)) walk(dir);
}
console.log('Refactor complete.');
