import fs from 'fs';
import path from 'path';

const baseConfig = {
    extends: "../../tsconfig.base.json",
    compilerOptions: {
        outDir: "dist",
        rootDir: "src"
    },
    include: ["src/**/*"],
    exclude: ["node_modules", "dist"]
};

function reconstruct(dir: string) {
    const tsconfigPath = path.join(dir, 'tsconfig.json');
    // We always want a tsconfig if it's a package/app directory with a src folder
    if (!fs.existsSync(path.join(dir, 'src')) && !fs.existsSync(tsconfigPath)) return;

    fs.writeFileSync(tsconfigPath, JSON.stringify(baseConfig, null, 2) + '\n');
    console.log(`🛠️ Reconstructed: ${path.basename(dir)}/tsconfig.json`);
}

const APPS_DIR = path.resolve('apps');
const PKGS_DIR = path.resolve('packages');

fs.readdirSync(APPS_DIR).forEach(d => reconstruct(path.join(APPS_DIR, d)));
fs.readdirSync(PKGS_DIR).forEach(d => reconstruct(path.join(PKGS_DIR, d)));
