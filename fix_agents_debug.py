import os
import re

agents_src = r"c:\multiagentic_project\multiAgent-main\packages\agents\src"

def fix_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return False
    
    is_in_services = 'services' in file_path
    rel_prefix = '../' if is_in_services else './'
    
    new_content = content
    
    # Very aggressive replacement for common patterns
    patterns = [
        (r'["\']@agents/base-agent["\']', f"'{rel_prefix}base-agent'"),
        (r'["\']@libs/agents["\']', f"'{rel_prefix}index'"),
        (r'["\']@agents/([^"\']+)["\']', rf"'{rel_prefix}\1'"),
    ]

    for pat, repl in patterns:
        if re.search(pat, new_content):
            print(f"Matching {pat} in {file_path}")
            new_content = re.sub(pat, repl, new_content)

    if is_in_services:
        # Fix redis/logger/event-bus
        new_content = new_content.replace("'./redis'", "'@libs/utils'")
        new_content = new_content.replace('"./redis"', "'@libs/utils'")
        new_content = new_content.replace("'../config/logger'", "'@libs/utils'")
        new_content = new_content.replace('"../config/logger"', "'@libs/utils'")
        new_content = new_content.replace("'./event-bus'", "'@libs/utils'")
        new_content = new_content.replace('"./event-bus"', "'@libs/utils'")

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed {file_path}")
        return True
    return False

for root, dirs, files in os.walk(agents_src):
    for file in files:
        if file.endswith('.ts'):
            fix_file(os.path.join(root, file))
