import os
import re

root_dir = r"c:\multiagentic_project\multiAgent-main"

# All available libs in packages/
libs = [d for d in os.listdir(os.path.join(root_dir, "packages")) if os.path.isdir(os.path.join(root_dir, "packages", d))]

# Map of aliases to @libs/
alias_map = {
    "@config": "@libs/utils",
    "@utils": "@libs/utils",
    "@services": "@libs/utils",
    "@queue": "@libs/utils",
    "@shared-types": "@libs/contracts",
    "@contracts": "@libs/contracts",
    "@supabase": "@libs/supabase",
    "@observability": "@libs/observability",
    "@validator": "@libs/validator",
    "@registry": "@libs/registry",
    "@agents": "@libs/agents"
}

for root, dirs, files in os.walk(root_dir):
    if "node_modules" in dirs:
        dirs.remove("node_modules")
    if ".next" in dirs:
        dirs.remove(".next")
    if "dist" in dirs:
        dirs.remove("dist")
        
    for file in files:
        if file.endswith(".ts") or file.endswith(".tsx"):
            file_path = os.path.join(root, file)
            
            # Identify current package
            current_lib = None
            if "packages\\" in file_path:
                parts = file_path.split("packages\\")
                current_lib = parts[1].split("\\")[0]

            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = content
            
            # 1. Standardize cross-package relative imports
            # Example: ../../../packages/contracts/xxx -> @libs/contracts
            for lib in libs:
                if current_lib == lib: continue
                # Match various depths of ../packages/lib
                new_content = re.sub(rf"['\"](\.\./)+packages/{lib}(/[^'\"]+)?['\"]", f"'@libs/{lib}'", new_content)

            # 2. Standardize aliases
            for alias, target in alias_map.items():
                target_lib = target.split('/')[-1]
                if current_lib == target_lib: continue
                new_content = re.sub(rf"['\"]{alias}(/[^'\"]+)?['\"]", f"'{target}'", new_content)

            # 3. Specifically fix redis-client in utils
            if current_lib == "utils":
                new_content = new_content.replace("redis-client", "redis")

            if new_content != content:
                print(f"Updating {file_path}")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
