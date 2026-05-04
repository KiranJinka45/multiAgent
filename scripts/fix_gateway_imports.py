import os
import re

services_dir = r"C:\multiAgentic_system\MultiAgent\api-gateway\services"

# Pattern to match both forward and backward slashes, and different depths
# We want to catch things like:
# from '../event-bus'
# from '../../shared/services/event-bus'
# from '../config/logger'
# from '../../config/logger'

patterns = [
    # Logger replacements
    (re.compile(r"from ['\"].*config/logger['\"]"), "from '@config/logger'"),
    # Event Bus replacements
    (re.compile(r"from ['\"].*(shared/services/|task-engine/|\.\./)event-bus['\"]"), "from '@shared/services/event-bus'"),
]

for root, dirs, files in os.walk(services_dir):
    for filename in files:
        if filename.endswith(".ts"):
            path = os.path.join(root, filename)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = content
            for pattern, replacement in patterns:
                new_content = pattern.sub(replacement, new_content)
            
            if new_content != content:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Fixed {os.path.relpath(path, services_dir)}")
