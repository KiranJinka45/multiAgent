import fs from 'fs';
import path from 'path';

/**
 * ─── Software Bill of Materials (SBOM) Generator ────────────────────────────
 * Generates an auditable Software Bill of Materials (SBOM) for the ZTAN platform
 * by parsing workspaces and compiling package inventory metadata.
 * ────────────────────────────────────────────────────────────────────────────
 */

interface SbomComponent {
    name: string;
    version: string;
    type: 'application' | 'library';
    description?: string;
    licenses?: string[];
    dependencies: string[];
}

const rootPackageJsonPath = path.resolve(__dirname, '../package.json');
const sbomOutputPath = path.resolve(__dirname, '../sbom.json');

if (!fs.existsSync(rootPackageJsonPath)) {
    console.error('[SBOM_ERROR] Root package.json is missing at:', rootPackageJsonPath);
    process.exit(1);
}

const rootPackage = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf-8'));

const sbom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.4',
    metadata: {
        timestamp: new Date().toISOString(),
        component: {
            name: rootPackage.name || 'ztan-root',
            version: rootPackage.version || '2.0.0',
            type: 'application'
        }
    },
    components: [] as SbomComponent[]
};

// 1. Add ZTAN monorepo workspace packages to SBOM
const packagesDir = path.resolve(__dirname, '../packages');
if (fs.existsSync(packagesDir)) {
    const packages = fs.readdirSync(packagesDir).filter(f => fs.statSync(path.join(packagesDir, f)).isDirectory());
    for (const pkg of packages) {
        const pkgJsonPath = path.join(packagesDir, pkg, 'package.json');
        if (fs.existsSync(pkgJsonPath)) {
            const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
            sbom.components.push({
                name: pkgJson.name,
                version: pkgJson.version,
                type: 'library',
                description: pkgJson.description || 'ZTAN Internal Library',
                licenses: pkgJson.license ? [pkgJson.license] : ['Proprietary'],
                dependencies: Object.keys(pkgJson.dependencies || {})
            });
        }
    }
}

// 2. Add main ZTAN applications to SBOM
const appsDir = path.resolve(__dirname, '../apps');
if (fs.existsSync(appsDir)) {
    const apps = fs.readdirSync(appsDir).filter(f => fs.statSync(path.join(appsDir, f)).isDirectory());
    for (const app of apps) {
        const appJsonPath = path.join(appsDir, app, 'package.json');
        if (fs.existsSync(appJsonPath)) {
            const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
            sbom.components.push({
                name: appJson.name,
                version: appJson.version,
                type: 'application',
                description: appJson.description || 'ZTAN Application Service',
                licenses: appJson.license ? [appJson.license] : ['Proprietary'],
                dependencies: Object.keys(appJson.dependencies || {})
            });
        }
    }
}

fs.writeFileSync(sbomOutputPath, JSON.stringify(sbom, null, 2), 'utf-8');
console.log(`\n✅ SBOM GENERATED SUCCESSFUL: ${sbomOutputPath} (Total components: ${sbom.components.length})`);
process.exit(0);
