import fs from 'fs-extra';
import path from 'path';

const packages = [
    "agents", "ai", "brain", "build-engine", "context", "core-engine",
    "memory", "observability", "registry", "sdk", "shared-services",
    "supabase", "templates", "tools", "ui", "validator", "utils", "contracts"
];

const baseConfig = `import { defineConfig, Options } from 'tsup';

export const baseConfig: Options = {
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false,
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
    "composite": false,
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

async function main() {
    for (const pkg of packages) {
        const pkgPath = path.join('packages', pkg);
        console.log(`Standardizing ${pkgPath}...`);

        // 1. Create src directory
        const srcPath = path.join(pkgPath, 'src');
        if (!fs.existsSync(srcPath)) {
            await fs.ensureDir(srcPath);
        }

        // 2. Move existing .ts files to src/
        const files = await fs.readdir(pkgPath);
        for (const file of files) {
            if (file.endsWith('.ts') && file !== 'index.ts' && file !== 'tsup.config.ts') {
                const oldPath = path.join(pkgPath, file);
                const newPath = path.join(srcPath, file);
                try {
                    await fs.move(oldPath, newPath, { overwrite: true });
                } catch (e) { }
            }
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
        await fs.writeJson(path.join(pkgPath, 'package.json'), pkgJson, { spaces: 2 });

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
        await fs.writeJson(path.join(pkgPath, 'tsconfig.json'), tsconfig, { spaces: 2 });

        // 5. Create local tsup.config.ts
        const tsupConfigContent = `import { defineConfig } from 'tsup';\nimport { baseConfig } from '../../tsup.config.base';\n\nexport default defineConfig({\n  ...baseConfig,\n  entry: ['src/index.ts'],\n});`;
        await fs.writeFile(path.join(pkgPath, 'tsup.config.ts'), tsupConfigContent);

        // 6. Create dummy index.ts if missing
        const indexTsPath = path.join(srcPath, 'index.ts');
        if (!fs.existsSync(indexTsPath)) {
            await fs.writeFile(indexTsPath, `// Entry point for @libs/${pkg}\nexport {};`);
        }
    }
}

main().catch(console.error);

