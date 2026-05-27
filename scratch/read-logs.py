import json
import os

log_path = r"C:\Users\Kiran\.gemini\antigravity-ide\brain\2e272222-910a-419d-b92c-0efe2c6d2bd4\.system_generated\logs\transcript.jsonl"
if os.path.exists(log_path):
    with open(log_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    print(f"Total lines in transcript: {len(lines)}")
    # Print the last few MODEL responses of type PLANNER_RESPONSE
    for line in lines[-200:]:
        try:
            obj = json.loads(line)
            if obj.get("source") == "MODEL" and obj.get("type") == "PLANNER_RESPONSE" and obj.get("content"):
                print(f"\n--- STEP {obj.get('step_index')} ({obj.get('created_at')}) ---")
                print(obj.get("content"))
        except Exception as e:
            pass
else:
    print("Log file does not exist")
