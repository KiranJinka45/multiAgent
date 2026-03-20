const fs = require('fs');
const path = require('path');

const packages = [
    "agents", "ai", "brain", "build-engine", "context", "core-engine", 
    "memory", "observability", "registry", "sdk", "shared-services", 
    "supabase", "templates", "tools", "ui", "validator", "utils", "contracts"
];

const tsupConfigBase = `import { defineConfig, Options } from 'tsup';

export const baseConfig: Options = {
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'node20',
  outDir: 'dist',
  silent: false,
  shims: true,
};

export default defineConfig(baseConfig);
`;

const tsconfigBase = `{
  "compilerOptions": {
    "target": "ESNext",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ESNext", "DOM"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "rootDir": "src",
    "outDir": "dist"
  },
  "exclude": ["node_modules", "dist"]
}
`;

function main() {
    packages.forEach(pkg => {
        const pkgPath = path.join('packages', pkg);
        console.log(`Standardizing ${pkgPath}...`);

        // 1. Create src directory
        const srcPath = path.join(pkgPath, 'src');
        if (!fs.existsSync(srcPath)) {
            fs.mkdirSync(srcPath, { recursive: true });
        }

        // 2. Move existing .ts files to src/
        if (fs.existsSync(pkgPath)) {
            const files = fs.readdirSync(pkgPath);
            files.forEach(file => {
                if (file.endsWith('.ts') && file !== 'index.ts' && file !== 'tsup.config.ts') {
                    const oldPath = path.join(pkgPath, file);
                    const newPath = path.join(srcPath, file);
                    try {
                        fs.renameSync(oldPath, newPath);
                    } catch (e) {}
                }
            });
        }

        // 3. Create package.json
        const pkgJson = {
            name: `@libs/${pkg}`,
            version: "0.1.0",
            main: "./dist/index.js",
            module: "./dist/index.mjs",
            types: "./dist/index.d.ts",
            files: ["dist"],
            scripts: {
                build: "tsup",
                dev: "tsup --watch",
                clean: "rimraf dist"
            },
            exports: {
                ".": {
                    import: "./dist/index.mjs",
                    require: "./dist/index.js",
                    types: "./dist/index.d.ts"
                }
            },
            devDependencies: {
                tsup: "^8.0.0",
                typescript: "^5.0.0",
                rimraf: "^5.0.0"
            }
        };
        fs.writeFileSync(path.join(pkgPath, 'package.json'), JSON.stringify(pkgJson, null, 2));

        // 4. Create local tsconfig.json
        const tsconfig = {
            extends: "../../tsconfig.base.json",
            compilerOptions: {
                outDir: "./dist",
                rootDir: "./src"
            },
            include: ["src/**/*"],
            exclude: ["node_modules", "dist"]
        };
        fs.writeFileSync(path.join(pkgPath, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));

        // 5. Create local tsup.config.ts
        const tsupConfigContent = `import { defineConfig } from 'tsup';\nimport { baseConfig } from '../../tsup.config.base';\n\nexport default defineConfig({\n  ...baseConfig,\n  entry: ['src/index.ts'],\n});`;
        fs.writeFileSync(path.join(pkgPath, 'tsup.config.ts'), tsupConfigContent);

        // 6. Create dummy index.ts if missing
        const indexTsPath = path.join(srcPath, 'index.ts');
        if (!fs.existsSync(indexTsPath)) {
            fs.writeFileSync(indexTsPath, `// Entry point for @libs/${pkg}\nexport {};`);
        }
    });
}

main();
