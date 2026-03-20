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
            
            # Determine relative path to src/
            rel_to_src = os.path.relpath(utils_src, root)
            up = rel_to_src.replace("\\", "/").replace(".", "")
            if not up: prefix = "./"
            else: prefix = up + "/"

            # 1. Map @libs/utils/xxx to relative paths
            new_content = re.sub(r"['\"]@libs/utils/([^'\"]+)['\"]", rf"'{prefix}\1'", new_content)
            
            # 2. Map @libs/utils imports to specific relative files
            # Determine path to config/ and services/
            depth = len(os.path.relpath(root, os.path.join(utils_src, "..")).split(os.sep))
            up_to_src = "../" * (depth - 1)
            if not up_to_src: up_to_src = "./"

            # Common members and their locations
            mapping = {
                "logger": "config/logger",
                "redis": "services/redis",
                "supabaseAdmin": "services/supabase-admin",
                "eventBus": "services/event-bus",
                "missionController": "services/mission-controller",
                "stateManager": "services/state-manager",
                "Orchestrator": "services/orchestrator",
                "AgentRegistry": "services/agent-registry",
                "agentRegistry": "services/agent-registry"
            }

            for member, loc in mapping.items():
                # import { member } from '@libs/utils' -> import { member } from 'up_to_src/loc'
                # but be careful with multi-member imports. 
                # For now, let's just replace the whole line if it contains '@libs/utils' and the member
                if "'@libs/utils'" in new_content or '"@libs/utils"' in new_content:
                    # Match import { ... member ... } from '@libs/utils'
                    # This is complex to do with regex perfectly, so let's do a simple one for common patterns
                    new_content = re.sub(rf"import\s+{{([^}}]*{member}[^}}]*)}}\s+from\s+['\"]@libs/utils['\"]", rf"import {{\1}} from '{up_to_src}{loc}'", new_content)
                    # Handle default import: import member from '@libs/utils'
                    new_content = re.sub(rf"import\s+{member}\s+from\s+['\"]@libs/utils['\"]", rf"import {member} from '{up_to_src}{loc}'", new_content)

            # Fallback for any remaining @libs/utils
            new_content = re.sub(r"['\"]@libs/utils['\"]", rf"'{up_to_src}index'", new_content)

            if new_content != content:
                print(f"Fixing {file_path}")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
