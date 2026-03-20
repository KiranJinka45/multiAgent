import os
import re

root_dir = r"c:\multiagentic_project\multiAgent-main"
dirs_to_process = [
    os.path.join(root_dir, "apps"),
    os.path.join(root_dir, "packages")
]

# All available libs in packages/
libs = [d for d in os.listdir(os.path.join(root_dir, "packages")) if os.path.isdir(os.path.join(root_dir, "packages", d))]

for base_dir in dirs_to_process:
    for root, dirs, files in os.walk(base_dir):
        if "node_modules" in dirs:
            dirs.remove("node_modules")
        if ".next" in dirs:
            dirs.remove(".next")
            
        for file in files:
            if file.endswith(".ts") or file.endswith(".tsx"):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                except:
                    continue
                
                new_content = content
                
                # 1. Standardize @libs/ and @multi-agent/ imports to root package
                for lib in libs:
                    # Replace imports from @libs/lib/subpath to @libs/lib
                    new_content = re.sub(rf"['\"]@(libs|multi-agent)/{lib}/[^'\"]+['\"]", f"'@libs/{lib}'", new_content)
                    # Standardize @multi-agent/lib to @libs/lib
                    new_content = re.sub(rf"['\"]@multi-agent/{lib}['\"]", f"'@libs/{lib}'", new_content)

                # 2. Fix relative imports that go into other packages/apps
                # Example: ../../packages/registry/xxx to @libs/registry
                for lib in libs:
                    new_content = re.sub(rf"['\"]\.\./\.\./packages/{lib}/[^'\"]+['\"]", f"'@libs/{lib}'", new_content)
                    new_content = re.sub(rf"['\"]\.\./packages/{lib}/[^'\"]+['\"]", f"'@libs/{lib}'", new_content)

                if new_content != content:
                    print(f"Updating {file_path}")
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(new_content)
