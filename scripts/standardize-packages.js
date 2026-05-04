"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
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
        const pkgPath = path_1.default.join('packages', pkg);
        console.log(`Standardizing ${pkgPath}...`);
        // 1. Create src directory
        const srcPath = path_1.default.join(pkgPath, 'src');
        if (!fs_extra_1.default.existsSync(srcPath)) {
            await fs_extra_1.default.ensureDir(srcPath);
        }
        // 2. Move existing .ts files to src/
        const files = await fs_extra_1.default.readdir(pkgPath);
        for (const file of files) {
            if (file.endsWith('.ts') && file !== 'index.ts' && file !== 'tsup.config.ts') {
                const oldPath = path_1.default.join(pkgPath, file);
                const newPath = path_1.default.join(srcPath, file);
                try {
                    await fs_extra_1.default.move(oldPath, newPath, { overwrite: true });
                }
                catch (e) { }
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
        await fs_extra_1.default.writeJson(path_1.default.join(pkgPath, 'package.json'), pkgJson, { spaces: 2 });
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
        await fs_extra_1.default.writeJson(path_1.default.join(pkgPath, 'tsconfig.json'), tsconfig, { spaces: 2 });
        // 5. Create local tsup.config.ts
        const tsupConfigContent = `import { defineConfig } from 'tsup';\nimport { baseConfig } from '../../tsup.config.base';\n\nexport default defineConfig({\n  ...baseConfig,\n  entry: ['src/index.ts'],\n});`;
        await fs_extra_1.default.writeFile(path_1.default.join(pkgPath, 'tsup.config.ts'), tsupConfigContent);
        // 6. Create dummy index.ts if missing
        const indexTsPath = path_1.default.join(srcPath, 'index.ts');
        if (!fs_extra_1.default.existsSync(indexTsPath)) {
            await fs_extra_1.default.writeFile(indexTsPath, `// Entry point for @libs/${pkg}\nexport {};`);
        }
    }
}
main().catch(console.error);
//# sourceMappingURL=standardize-packages.js.map