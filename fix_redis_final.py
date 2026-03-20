import os

utils_src = r"c:\multiagentic_project\multiAgent-main\packages\utils\src"

for root, dirs, files in os.walk(utils_src):
    for file in files:
        if file.endswith(".ts"):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            if "redis-client" in content:
                print(f"Fixing {file_path}")
                new_content = content.replace("redis-client", "redis")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
