const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src/generated');
const distDir = path.join(__dirname, '../dist/generated');

if (fs.existsSync(srcDir)) {
    console.log('Copying Prisma client from src to dist...');
    fs.mkdirSync(distDir, { recursive: true });
    
    const copyRecursiveSync = (src, dest) => {
        const stats = fs.statSync(src);
        if (stats.isDirectory()) {
            if (!fs.existsSync(dest)) fs.mkdirSync(dest);
            fs.readdirSync(src).forEach(childItemName => {
                copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
            });
        } else {
            fs.copyFileSync(src, dest);
        }
    };
    
    copyRecursiveSync(srcDir, distDir);
    console.log('Successfully copied Prisma client.');
} else {
    console.error('Source Prisma client not found in src/generated');
    process.exit(1);
}
