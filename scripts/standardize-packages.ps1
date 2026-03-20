$packages = @(
    "agents", "ai", "brain", "build-engine", "context", "core-engine", 
    "memory", "observability", "registry", "sdk", "shared-services", 
    "supabase", "templates", "tools", "ui", "validator"
)

foreach ($pkg in $packages) {
    $pkgPath = "packages\$pkg"
    Write-Host "Standardizing $pkgPath..."
    
    # 1. Create src directory
    if (-not (Test-Path "$pkgPath\src")) {
        mkdir "$pkgPath\src"
    }

    # 2. Move existing .ts files to src/ (if any are in root)
    Get-ChildItem -Path $pkgPath -Filter "*.ts" | ForEach-Object {
        if ($_.Name -ne "index.ts") {
            mv $_.FullName "$pkgPath\src\" -ErrorAction SilentlyContinue
        }
    }

    # 3. Create basic package.json if it doesn't exist or is invalid
    $pkgJson = @{
        name = "@libs/$pkg"
        version = "0.1.0"
        main = "./dist/index.js"
        module = "./dist/index.mjs"
        types = "./dist/index.d.ts"
        files = @("dist")
        scripts = @{
            build = "tsup"
            dev = "tsup --watch"
            clean = "rimraf dist"
        }
        exports = @{
            "." = @{
                import = "./dist/index.mjs"
                require = "./dist/index.js"
                types = "./dist/index.d.ts"
            }
        }
        devDependencies = @{
            tsup = "^8.0.0"
            typescript = "^5.0.0"
            rimraf = "^5.0.0"
        }
    }
    
    $pkgJson | ConvertTo-Json -Depth 10 | Out-File -FilePath "$pkgPath\package.json" -Encoding utf8

    # 4. Create local tsconfig.json
    $tsConfig = @{
        extends = "../../tsconfig.base.json"
        compilerOptions = @{
            outDir = "./dist"
            rootDir = "./src"
        }
        include = @("src/**/*")
        exclude = @("node_modules", "dist")
    }
    $tsConfig | ConvertTo-Json -Depth 10 | Out-File -FilePath "$pkgPath\tsconfig.json" -Encoding utf8

    # 5. Create local tsup.config.ts
    $tsupConfig = "import { defineConfig } from 'tsup';`nimport { baseConfig } from '../../tsup.config.base';`n`nexport default defineConfig({`n  ...baseConfig,`n  entry: ['src/index.ts'],`n});"
    $tsupConfig | Out-File -FilePath "$pkgPath\tsup.config.ts" -Encoding utf8

    # 6. Create dummy index.ts if missing
    if (-not (Test-Path "$pkgPath\src\index.ts")) {
        "// Entry point for @libs/$pkg`nexport {};" | Out-File -FilePath "$pkgPath\src\index.ts" -Encoding utf8
    }
}
