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
            
            # 1. Determine how many levels up to get to packages/utils/src
            rel_to_src = os.path.relpath(utils_src, root)
            up = rel_to_src.replace("\\", "/").replace(".", "")
            if not up: prefix = "./"
            else: prefix = up + "/"

            # 2. Replace @libs/utils/xxx with relative path
            new_content = re.sub(r"['\"]@libs/utils/([^'\"]+)['\"]", rf"'{prefix}\1'", new_content)
            
            # 3. Handle @libs/utils (usually this means config/logger or root index)
            # If it's a top-level file, it might want logger. 
            # If it's a deep file, it might want ../config/logger.
            # Lets check if it's imported as { logger } or just logger
            if "'@libs/utils'" in content or '"@libs/utils"' in content:
                # Most common case in moved files
                new_content = re.sub(r"import logger from ['\"]@libs/utils['\"]", rf"import logger from '{prefix}config/logger'", new_content)
                new_content = re.sub(r"import { logger } from ['\"]@libs/utils['\"]", rf"import { {logger} } from '{prefix}config/logger'", new_content)
                # Fallback to root index if not logger
                new_content = re.sub(r"['\"]@libs/utils['\"]", rf"'{prefix}index'", new_content)

            if new_content != content:
                print(f"Fixing {file_path}")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
