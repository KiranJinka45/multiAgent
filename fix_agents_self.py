import os
import re

agents_src = r"c:\multiagentic_project\multiAgent-main\packages\agents\src"

def fix_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace import { ... } from '@libs/agents' with relative
    # This is tricky because we need to know where the agent classes are.
    # Most agents are in src/*.ts and services are in src/services/*.ts
    
    # Simple approach: If it's src/services/agent-registry.ts, it should import from '..'
    rel_path = os.path.relpath(agents_src, os.path.dirname(file_path))
    if rel_path == '.':
        rel_path = './index'
    else:
        rel_path = os.path.join(rel_path, 'index').replace('\\', '/')
        if not rel_path.startswith('.'):
            rel_path = './' + rel_path

    new_content = re.sub(r"from '@libs/agents'", f"from '{rel_path}'", content)
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

for root, dirs, files in os.walk(agents_src):
    for file in files:
        if file.endswith('.ts'):
            fix_file(os.path.join(root, file))
