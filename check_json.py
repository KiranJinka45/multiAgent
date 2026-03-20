import os
import json

base_dir = r"c:\multiagentic_project\multiAgent-main"

for root, dirs, files in os.walk(base_dir):
    if "node_modules" in dirs:
        dirs.remove("node_modules")
    for file in files:
        if file == "package.json":
            file_path = os.path.join(root, file)
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    json.load(f)
            except Exception as e:
                print(f"ERROR in {file_path}: {e}")
