import os
import re

api_dir = r"C:\multiAgentic_system\MultiAgent\api-gateway\api"

# This time we match any number of ../ followed by the directory name
replacements = [
    (re.compile(r"from (['\"])\.\.(/\.\.)*/config/"), r"from \1@config/"),
    (re.compile(r"from (['\"])\.\.(/\.\.)*/shared/services/event-bus"), r"from \1@services/event-bus"),
    (re.compile(r"from (['\"])\.\.(/\.\.)*/shared/services/"), r"from \1@shared/services/"),
    (re.compile(r"from (['\"])\.\.(/\.\.)*/shared/services/queue"), r"from \1@queue"),
    (re.compile(r"from (['\"])\.\.(/\.\.)*/services/"), r"from \1@services/"),
    (re.compile(r"from (['\"])\.\.(/\.\.)*/types/"), r"from \1@shared-types/"),
    (re.compile(r"from (['\"])\.\.(/\.\.)*/agents/"), r"from \1@agents/"),
]

for root, dirs, files in os.walk(api_dir):
    for filename in files:
        if filename.endswith(".ts") or filename.endswith(".tsx"):
            path = os.path.join(root, filename)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = content
            # Order matters: more specific ones first
            # Re-order replacements to ensure long paths don't get partially matched
            # We'll re-run with a simpler strategy: just look for the leaf directory
            
            # Refined strategy: find the first occurrence of config, shared, types, etc. after any number of ../
            
            patterns = [
                (r"\.\.(/\.\.)*/config/", "@config/"),
                (r"\.\.(/\.\.)*/shared/services/event-bus", "@services/event-bus"),
                (r"\.\.(/\.\.)*/shared/services/queue", "@queue"),
                (r"\.\.(/\.\.)*/shared/services/", "@shared/services/"),
                (r"\.\.(/\.\.)*/services/", "@services/"),
                (r"\.\.(/\.\.)*/types/", "@shared-types/"),
                (r"\.\.(/\.\.)*/agents/", "@agents/"),
            ]
            
            for pattern, replacement in patterns:
                new_content = re.sub(r"from (['\"])" + pattern, r"from \1" + replacement, new_content)
            
            if new_content != content:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                rel_path = os.path.relpath(path, api_dir)
                print(f"Standardized deep imports in: {rel_path}")
