import os
import re

utils_src = r"c:\multiagentic_project\multiAgent-main\packages\utils\src"

def fix_file(file_path):
    root = os.path.dirname(file_path)
    rel_to_src = os.path.relpath(utils_src, root)
    # Convert '..' to '../' or '.' to './'
    prefix = rel_to_src.replace("\\", "/")
    if prefix == ".":
        prefix = "."
    
    # Target is src/services/redis
    target = f"{prefix}/services/redis".replace("//", "/")
    
    # Special cases for files already in services
    if "services" in root and "memory" not in root and "vfs" not in root:
        target = "./redis"
    elif "services/memory" in root or "services/vfs" in root:
        target = "../redis"
    
    with open(file_path, "r", encoding="utf-8-sig") as f:
        content = f.read()
    
    # Replace any variant of redis/redis-client relative imports
    # Match: from './redis', from '../redis', from './redis-client', from '@libs/utils' (if it's a self-ref)
    new_content = re.sub(r"(from\s+['\"])(?:\.?\.?/)*(?:services/)?(?:redis-client|redis|@libs/utils)(['\"])", rf"\1{target}\2", content)
    
    if new_content != content:
        print(f"Fixing {file_path} -> {target}")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)

for root, dirs, files in os.walk(utils_src):
    for file in files:
        if file.endswith(".ts"):
            fix_file(os.path.join(root, file))
