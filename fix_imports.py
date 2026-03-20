import os
import re

base_dir = r"c:\multiagentic_project\multiAgent-main\packages\utils\src"

alias_map = {
    "@lib/": "lib/",
    "@services/": "services/",
    "@config/": "config/",
    "@queue/": "services/",
    "@shared/": ""
}

def get_relative_path(from_file, to_path):
    rel_path = os.path.relpath(os.path.join(base_dir, to_path), os.path.dirname(from_file))
    rel_path = rel_path.replace("\\", "/")
    if not rel_path.startswith("."):
        rel_path = "./" + rel_path
    return rel_path

for root, dirs, files in os.walk(base_dir):
    for file in files:
        if file.endswith(".ts") or file.endswith(".tsx"):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = content
            
            # Replace @shared-types/ with @libs/contracts/
            new_content = new_content.replace("@shared-types/", "@libs/contracts/")
            
            # Replace platform aliases with relative paths
            for alias, target in alias_map.items():
                def replacer(match):
                    aliased_path = match.group(1)
                    return f"from '{get_relative_path(file_path, target + aliased_path)}'"
                
                new_content = re.sub(f"from ['\"]{alias}([^'\"]+)['\"]", replacer, new_content)
                
                def replacer_types(match):
                    aliased_path = match.group(1)
                    return f"import {{ (.*) }} from '{get_relative_path(file_path, target + aliased_path)}'"
                # Simplified re.sub for imports without 'from' is harder, but we mostly have 'from'
            
            if new_content != content:
                print(f"Updating {file_path}")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
