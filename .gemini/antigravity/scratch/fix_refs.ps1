$packagesDir = "c:\multiagentic_project\multiAgent-main\packages"
Get-ChildItem -Path $packagesDir -Filter package.json -Recurse | ForEach-Object {
    $pjFile = $_.FullName
    $pj = Get-Content $pjFile -Raw | ConvertFrom-Json
    $dir = $_.DirectoryName
    $tsFile = Join-Path $dir "tsconfig.json"
    
    if (Test-Path $tsFile) {
        $deps = @()
        if ($pj.dependencies) {
            $deps += $pj.dependencies.PSObject.Properties.Name | Where-Object { $_ -match "^@packages/" }
        }
        if ($pj.devDependencies) {
            $deps += $pj.devDependencies.PSObject.Properties.Name | Where-Object { $_ -match "^@packages/" }
        }
        
        if ($deps.Count -gt 0) {
            $refs = $deps | ForEach-Object {
                $name = $_.Replace("@packages/", "")
                "        { `"path`": `"..//$name`" }"
            }
            $refsStr = "    `"references`": [`r`n" + ($refs -join ",`r`n") + "`r`n    ]"
            
            $tc = Get-Content $tsFile -Raw
            if ($tc -match '"references":\s*\[') {
                # Already has references, maybe skip or merge? For now skip to be safe.
            } else {
                # Remove last bracket and add references
                $tc = $tc.TrimEnd().TrimEnd('}')
                if ($tc.Trim().EndsWith(',')) {
                    $tc += "`r`n$refsStr`r`n}"
                } else {
                    $tc += ",`r`n$refsStr`r`n}"
                }
                Set-Content $tsFile $tc
                Write-Host "Updated $tsFile"
            }
        }
    }
}
