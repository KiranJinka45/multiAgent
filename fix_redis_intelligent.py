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
            
            # Determine path to services/redis.ts from current file
            depth = len(os.path.relpath(root, utils_src).split(os.sep))
            # if root == utils_src, depth is 1 (path is '.')
            # if root == utils_src/services, depth is 1 (path is 'services') -> actually relpath('.', 'services') is '..'
            
            rel_to_src = os.path.relpath(utils_src, root)
            up = rel_to_src.replace("\\", "/").replace(".", "")
            if not up: prefix = "./"
            else: prefix = up + "/"
            
            # Target for redis is src/services/redis
            redis_rel = f"{prefix}services/redis"
            if "services" in root and "memory" not in root:
                redis_rel = "./redis"
            elif "services/memory" in root:
                redis_rel = "../redis"
            elif "services/vfs" in root:
                redis_rel = "../redis"
            
            # Match imports of redis or redis-client
            new_content = re.sub(r"(from\s+['\"])(?:\.?\.?/)*(?:services/)?(?:redis-client|redis)(['\"])", rf"\1{redis_rel}\2", new_content)
            
            if new_content != content:
                print(f"Fixing {file_path} -> {redis_rel}")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
