import os
import re

root_dir = r"c:\multiagentic_project\multiAgent-main"
utils_src = os.path.join(root_dir, "packages", "utils", "src")

for root, dirs, files in os.walk(utils_src):
    for file in files:
        if file.endswith(".ts") or file.endswith(".tsx"):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = content
            # Replace any import from redis-client to redis
            new_content = re.sub(r"['\"](\.?\.?)/([^'\"]+/)??redis-client['\"]", lambda m: f"'{m.group(1)}/{m.group(2) if m.group(2) else ''}redis'", new_content)
            # Handle direct ./redis-client
            new_content = re.sub(r"['\"](\.?\.?)/redis-client['\"]", r"'\1/redis'", new_content)

            if new_content != content:
                print(f"Updating {file_path}")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
