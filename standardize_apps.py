import os
import re

base_dir = r"c:\multiagentic_project\multiAgent-main\apps\web"

# Also include other apps
apps = [
    r"c:\multiagentic_project\multiAgent-main\apps\web",
    r"c:\multiagentic_project\multiAgent-main\apps\api",
    r"c:\multiagentic_project\multiAgent-main\apps\orchestrator",
    r"c:\multiagentic_project\multiAgent-main\apps\worker"
]

for app_dir in apps:
    for root, dirs, files in os.walk(app_dir):
        if "node_modules" in dirs:
            dirs.remove("node_modules")
        if ".next" in dirs:
            dirs.remove(".next")
            
        for file in files:
            if file.endswith(".ts") or file.endswith(".tsx"):
                file_path = os.path.join(root, file)
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                new_content = content
                
                # Standardize imports to root package
                for lib in ["contracts", "supabase", "observability", "utils", "validator"]:
                    new_content = re.sub(rf"['\"]@(libs|multi-agent)/{lib}/[^'\"]+['\"]", f"'@libs/{lib}'", new_content)
                    new_content = re.sub(rf"['\"]@(libs|multi-agent)/{lib}['\"]", f"'@libs/{lib}'", new_content)

                if new_content != content:
                    print(f"Updating {file_path}")
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(new_content)
