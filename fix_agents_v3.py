import os
import re

agents_src = r"c:\multiagentic_project\multiAgent-main\packages\agents\src"

def fix_file(file_path):
    with open(file_path, 'r', encoding='utf-8-sig') as f:
        content = f.read()
    
    is_in_services = 'services' in file_path
    rel_prefix = '../' if is_in_services else './'
    
    # 1. Replace @agents/ with relative
    new_content = re.sub(r'["\']@agents/([^"\']+)["\']', rf"'{rel_prefix}\1'", content)
    
    # 2. Replace @libs/agents with relative index
    new_content = re.sub(r'["\']@libs/agents["\']', rf"'{rel_prefix}index'", new_content)
    
    # 3. Fix moved services dependencies
    if is_in_services:
        # These were relative when in utils/src/services
        # Now in agents/src/services, they should point to @libs/utils
        new_content = re.sub(r'from ["\']\./redis["\']', "from '@libs/utils'", new_content)
        new_content = re.sub(r'from ["\']\.\./config/logger["\']', "from '@libs/utils'", new_content)
        new_content = re.sub(r'from ["\']\./event-bus["\']', "from '@libs/utils'", new_content)
        new_content = re.sub(r'from ["\']\.\./redis["\']', "from '@libs/utils'", new_content)
        new_content = re.sub(r'from ["\']\.\./services/redis["\']', "from '@libs/utils'", new_content)

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

for root, dirs, files in os.walk(agents_src):
    for file in files:
        if file.endswith('.ts'):
            fix_file(os.path.join(root, file))
