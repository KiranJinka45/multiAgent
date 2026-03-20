import os
import re

root_dir = r"c:\multiagentic_project\multiAgent-main"
dirs_to_process = [
    os.path.join(root_dir, "apps"),
    os.path.join(root_dir, "packages")
]

# All available libs in packages/
libs = [d for d in os.listdir(os.path.join(root_dir, "packages")) if os.path.isdir(os.path.join(root_dir, "packages", d))]

# Map of aliases to @libs/
alias_map = {
    "@config": "@libs/utils",
    "@services": "@libs/utils",
    "@queue": "@libs/utils",
    "@shared-types": "@libs/contracts",
    "@contracts": "@libs/contracts",
    "@supabase": "@libs/supabase",
    "@observability": "@libs/observability",
    "@validator": "@libs/validator",
    "@registry": "@libs/registry"
}

for base_dir in dirs_to_process:
    for root, dirs, files in os.walk(base_dir):
        if "node_modules" in dirs:
            dirs.remove("node_modules")
        if ".next" in dirs:
            dirs.remove(".next")
            
        for file in files:
            if file.endswith(".ts") or file.endswith(".tsx"):
                file_path = os.path.join(root, file)
                
                # Determine which lib this file belongs to (if any)
                current_lib = None
                if "packages" in file_path:
                    parts = file_path.split(os.sep)
                    try:
                        idx = parts.index("packages")
                        current_lib = parts[idx+1]
                    except:
                        pass

                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                except:
                    continue
                
                new_content = content
                
                # 1. Standardize @libs/ and @multi-agent/ imports to root package
                for lib in libs:
                    # SKIP if we are in the same lib
                    if current_lib == lib:
                        continue
                    
                    # Replace imports from @libs/lib/subpath to @libs/lib
                    new_content = re.sub(rf"['\"]@(libs|multi-agent)/{lib}/[^'\"]+['\"]", f"'@libs/{lib}'", new_content)
                    # Standardize @multi-agent/lib to @libs/lib
                    new_content = re.sub(rf"['\"]@multi-agent/{lib}['\"]", f"'@libs/{lib}'", new_content)

                # 2. Standardize aliases from tsconfig
                for alias, target in alias_map.items():
                    # SKIP if target is the same lib we are in
                    target_lib = target.split('/')[-1]
                    if current_lib == target_lib:
                        continue
                    
                    new_content = re.sub(rf"['\"]{alias}(/[^'\"]+)?['\"]", f"'{target}'", new_content)

                # 3. Fix relative imports that go into other packages/apps
                for lib in libs:
                    if current_lib == lib:
                        continue
                    new_content = re.sub(rf"['\"]\.\./\.\./packages/{lib}(/[^'\"]+)?['\"]", f"'@libs/{lib}'", new_content)
                    new_content = re.sub(rf"['\"]\.\./packages/{lib}(/[^'\"]+)?['\"]", f"'@libs/{lib}'", new_content)

                if new_content != content:
                    print(f"Updating {file_path}")
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(new_content)
