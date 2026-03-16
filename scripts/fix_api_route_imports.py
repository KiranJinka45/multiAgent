import os
import re

api_dir = r"C:\multiAgentic_system\MultiAgent\api-gateway\api"

replacements = [
    # Config
    (re.compile(r"from (['\"])\.\./\.\./\.\./\.\./config/"), r"from \1@config/"),
    (re.compile(r"from (['\"])\.\./\.\./\.\./config/"), r"from \1@config/"),
    # Shared Services & Type Aliases
    (re.compile(r"from (['\"])\.\./\.\./\.\./\.\./shared/services/event-bus"), r"from \1@services/event-bus"),
    (re.compile(r"from (['\"])\.\./\.\./\.\./\.\./shared/services/queue"), r"from \1@queue"),
    (re.compile(r"from (['\"])\.\./\.\./\.\./\.\./shared/services/"), r"from \1@shared/services/"),
    # Gateway Services
    (re.compile(r"from (['\"])\.\./\.\./\.\./\.\./services/"), r"from \1@services/"),
    (re.compile(r"from (['\"])\.\./\.\./\.\./services/"), r"from \1@services/"),
    # Types
    (re.compile(r"from (['\"])\.\./\.\./\.\./\.\./types/"), r"from \1@shared-types/"),
]

for root, dirs, files in os.walk(api_dir):
    for filename in files:
        if filename.endswith(".ts") or filename.endswith(".tsx"):
            path = os.path.join(root, filename)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = content
            for pattern, replacement in replacements:
                new_content = pattern.sub(replacement, new_content)
            
            if new_content != content:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                rel_path = os.path.relpath(path, api_dir)
                print(f"Standardized imports in: {rel_path}")
