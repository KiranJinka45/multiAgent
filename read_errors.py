import os

error_file = r"c:\multiagentic_project\multiAgent-main\packages\utils\tsc_errors.txt"

try:
    with open(error_file, "r", encoding="utf-16le") as f:
        content = f.read()
except:
    with open(error_file, "r", encoding="utf-16") as f:
        content = f.read()

print(content)
