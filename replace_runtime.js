const fs = require('fs');
const path = require('path');

const files = [
    'packages/core-engine/src/orchestrator.ts',
    'packages/core-engine/src/task-engine/executor.ts',
    'apps/frontend/app/preview/[id]/route.ts',
    'apps/frontend/app/api/runtime/[projectId]/route.ts',
    'apps/frontend/app/api/preview-proxy/[projectId]/route.ts',
    'apps/frontend/app/api/preview/restart/route.ts',
    'apps/frontend/app/api/builds/[id]/apply-patch/route.ts',
    'apps/frontend/app/api/admin/runtime-stats/route.ts',
    'apps/frontend/app/api/admin/containers/route.ts',
    'apps/frontend/app/api/admin/cluster/route.ts',
    'apps/frontend/app/api/builds/[id]/edit/route.ts',
    'apps/worker/build-worker.ts'
];

files.forEach(file => {
    const fullPath = path.resolve('C:/multiagentic_project/multiAgent-main', file);
    if (!fs.existsSync(fullPath)) {
        console.log(`File not found: ${file}`);
        return;
    }
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(/@runtime\//g, '@libs/runtime/');
    fs.writeFileSync(fullPath, content);
    console.log(`Updated: ${file}`);
});
