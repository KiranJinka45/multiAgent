import os

utils_dir = r"c:\multiagentic_project\multiAgent-main\packages\utils"

for root, dirs, files in os.walk(utils_dir):
    if "node_modules" in dirs:
        dirs.remove("node_modules")
    if "dist" in dirs:
        dirs.remove("dist")
    for file in files:
        if file.endswith(".ts") or file.endswith(".json"):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            if "@libs/utils" in content:
                print(f"Found @libs/utils in {file_path}")
