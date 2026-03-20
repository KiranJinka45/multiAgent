import os
import re

utils_src = r"c:\multiagentic_project\multiAgent-main\packages\utils\src"

for root, dirs, files in os.walk(utils_src):
    for file in files:
        if file.endswith(".ts"):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = content
            
            # 1. Fix import redis from '.../redis-client' -> import { redis } from '.../redis'
            new_content = re.sub(r"import redis from ['\"]([^'\"]+)redis-client['\"]", r"import { redis } from '\1redis'", new_content)
            
            # 2. Fix remaining redis-client occurrences
            new_content = new_content.replace("redis-client", "redis")

            if new_content != content:
                print(f"Fixing {file_path}")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
