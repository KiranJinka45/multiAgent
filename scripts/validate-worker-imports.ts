import fs from 'fs';
import path from 'path';

const workersDir = path.join(process.cwd(), 'workers');
const workers = fs.readdirSync(workersDir).filter(f => f.endsWith('.ts'));

console.log(`Checking ${workers.length} workers...`);

workers.forEach(worker => {
    const content = fs.readFileSync(path.join(workersDir, worker), 'utf8');
    const imports = content.match(/from ['"](\.\.?\/.*)['"]/g);
    
    if (imports) {
        imports.forEach(imp => {
            const relPath = imp.match(/['"](.*)['"]/)[1];
            const fullPath = path.resolve(workersDir, relPath);
            
            // Check for .ts, .tsx, or directory/index.ts
            const possiblePaths = [
                fullPath + '.ts',
                fullPath + '.tsx',
                path.join(fullPath, 'index.ts'),
                fullPath // literal
            ];
            
            const exists = possiblePaths.some(p => fs.existsSync(p));
            
            if (!exists) {
                console.error(`❌ [${worker}] Broken import: ${relPath} (Resolved: ${fullPath})`);
            }
        });
    }
});

