import os
import re

base_dir = r"c:\multiagentic_project\multiAgent-main\apps\sandbox-runtime\src"
deps = set()

for root, dirs, files in os.walk(base_dir):
    for file in files:
        if file.endswith(".ts") or file.endswith(".tsx"):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Find all imports
            matches = re.findall(r"from ['\"]([^'\".][^'\"]*)['\"]", content)
            for m in matches:
                # Get root package name (e.g., @libs/utils -> @libs/utils, lodash/fp -> lodash)
                parts = m.split('/')
                if m.startswith('@'):
                    deps.add('/'.join(parts[:2]))
                else:
                    deps.add(parts[0])

print("\n".join(sorted(list(deps))))
