import os
import re

base_dir = r"c:\multiagentic_project\multiAgent-main\packages\utils\src"

for root, dirs, files in os.walk(base_dir):
    for file in files:
        if file.endswith(".ts") or file.endswith(".tsx"):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = content
            
            # Change @libs/contracts/xxx to @libs/contracts
            new_content = re.sub(r"@libs/contracts/[^'\"]+", "@libs/contracts", new_content)
            
            # Change @libs/supabase/xxx to @libs/supabase
            new_content = re.sub(r"@libs/supabase/[^'\"]+", "@libs/supabase", new_content)
            
            if new_content != content:
                print(f"Updating {file_path}")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
