import os
import re

utils_services = r"c:\multiagentic_project\multiAgent-main\packages\utils\src\services"

for root, dirs, files in os.walk(utils_services):
    for file in files:
        if file.endswith(".ts"):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = content
            
            # 1. Replace @libs/utils/xxx with relative imports (if we are in utils)
            # Find how many levels up to get to src/
            rel_path = os.path.relpath(utils_services, root)
            up = rel_path.replace("\\", "/").replace(".", "")
            if not up: up = "."
            else: up = "./" + up

            # Fix @libs/utils -> up + /config/logger or similar
            # For simplicity, just replace @libs/utils with a relative path to src/index or specific files
            # Actually, most files want logger from ../config/logger
            
            # Determine path to config/logger
            depth = len(os.path.relpath(root, os.path.join(utils_services, "..")).split(os.sep))
            up_to_root = "../" * (depth - 1)
            if not up_to_root: up_to_root = "./"
            
            new_content = re.sub(r"['\"]@libs/utils['\"]", f"'{up_to_root}config/logger'", new_content)
            new_content = re.sub(r"['\"]@libs/utils/config/logger['\"]", f"'{up_to_root}config/logger'", new_content)

            if new_content != content:
                print(f"Fixing {file_path}")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
