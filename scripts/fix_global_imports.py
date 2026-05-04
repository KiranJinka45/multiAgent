import os
import re

roots = [
    r"C:\multiAgentic_system\MultiAgent\api-gateway\services",
    r"C:\multiAgentic_system\MultiAgent\agents",
]

patterns = [
    (r"\.\.(/\.\.)*/config/", "@config/"),
    (r"\.\.(/\.\.)*/shared/services/event-bus", "@services/event-bus"),
    (r"\.\.(/\.\.)*/shared/services/queue", "@queue"),
    (r"\.\.(/\.\.)*/shared/services/", "@shared/services/"),
    (r"\.\.(/\.\.)*/services/", "@services/"),
    (r"\.\.(/\.\.)*/types/", "@shared-types/"),
    (r"\.\.(/\.\.)*/agents/", "@agents/"),
]

for base_dir in roots:
    for root, dirs, files in os.walk(base_dir):
        for filename in files:
            if filename.endswith(".ts") or filename.endswith(".tsx"):
                path = os.path.join(root, filename)
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                new_content = content
                for pattern, replacement in patterns:
                    new_content = re.sub(r"from (['\"])" + pattern, r"from \1" + replacement, new_content)
                
                if new_content != content:
                    with open(path, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    rel_path = os.path.relpath(path, base_dir)
                    print(f"Fixed {rel_path} in {os.path.basename(base_dir)}")
