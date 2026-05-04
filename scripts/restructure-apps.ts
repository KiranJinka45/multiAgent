import fs from 'fs';
import path from 'path';

function restructure(appDir: string) {
    const srcDir = path.join(appDir, 'src');
    if (!fs.existsSync(srcDir)) {
        fs.mkdirSync(srcDir, { recursive: true });
    }

    const files = fs.readdirSync(appDir);
    files.forEach(file => {
        if (file.endsWith('.ts') && !file.includes('config') && file !== 'src') {
            const oldPath = path.join(appDir, file);
            const newPath = path.join(srcDir, file);
            try {
                fs.renameSync(oldPath, newPath);
                console.log(`✅ Moved ${file} to src/`);
            } catch (e) {
                console.log(`❌ Failed to move ${file}: ${e.message}`);
            }
        }
    });
}

const appsToFix = [
    path.resolve('apps/billing-service'),
    path.resolve('apps/worker')
];

appsToFix.forEach(dir => {
    if (fs.existsSync(dir)) {
        console.log(`🛠️ Restructuring ${path.basename(dir)}...`);
        restructure(dir);
    }
});

