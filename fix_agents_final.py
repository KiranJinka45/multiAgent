import os
import re

agents_src = r"c:\multiagentic_project\multiAgent-main\packages\agents\src"

def fix_file(file_path):
    with open(file_path, 'r', encoding='utf-8-sig') as f: # -sig handles BOM
        content = f.read()
    
    # 1. Replace '@agents/base-agent' with relative
    # If in src/*.ts, relative is './base-agent'
    # If in src/services/*.ts, relative is '../base-agent'
    is_in_services = 'services' in file_path
    base_agent_rel = '../base-agent' if is_in_services else './base-agent'
    
    new_content = content.replace("'@agents/base-agent'", f"'{base_agent_rel}'")
    new_content = new_content.replace('"@agents/base-agent"', f'"{base_agent_rel}"')

    # 2. Fix broken './redis' and './config/logger' imports in services (moved from utils)
    if is_in_services:
        new_content = new_content.replace("from './redis'", "from '@libs/utils'")
        new_content = new_content.replace('from "./redis"', 'from "@libs/utils"')
        new_content = new_content.replace("from '../config/logger'", "from '@libs/utils'")
        new_content = new_content.replace('from "../config/logger"', 'from "@libs/utils"')
        new_content = new_content.replace("from './event-bus'", "from '@libs/utils'")

    # 3. Handle self-referencing @libs/agents
    # If it's the index.ts, it's fine (though we generate it).
    # If it's a service, it should probably import from '..' or specific files.
    # For now, let's map '@libs/agents' to relative index
    index_rel = '../index' if is_in_services else './index'
    new_content = new_content.replace("'@libs/agents'", f"'{index_rel}'")
    new_content = new_content.replace('"@libs/agents"', f'"{index_rel}"')

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

for root, dirs, files in os.walk(agents_src):
    for file in files:
        if file.endswith('.ts'):
            fix_file(os.path.join(root, file))
