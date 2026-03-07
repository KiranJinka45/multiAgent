import json
import time
from typing import Dict, Any, Optional
import os
import sys

# Assume agent.py provides `BaseAgent`
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from agent import BaseAgent
except ImportError:
    # Fallback for testing isolated engine
    class BaseAgent:
        def __init__(self, *args, **kwargs): pass
        def run(self, *args, **kwargs): return "{}"

class PatchDebugEngine:
    """
    Patch-Based Debug Engine.
    Ensures the Debug Agent NEVER regenerates an entire project.
    Enforces strict file-level patching with exponential backoff.
    """
    def __init__(self, debug_agent: BaseAgent):
        self.debug_agent = debug_agent
        self.max_retries = 3
        self.base_backoff_sec = 2

    def _validate_patch(self, patch_data: dict) -> bool:
        """Validates that the output matches the strict patch contract."""
        required_keys = {"file_path", "patch_type", "updated_content"}
        if not required_keys.issubset(patch_data.keys()):
            return False
        if patch_data["patch_type"] not in ["replace", "insert", "delete"]:
            return False
        return True

    def debug_file(self, file_path: str, failing_line: str, source_code: str, error_log: str) -> Optional[Dict[str, str]]:
        """
        Sends specific isolated context to the debug agent.
        Requires narrow context to prevent hallucinations.
        """
        input_payload = json.dumps({
            "instruction": "Output STRICTLY JSON payload. DO NOT output full project. ONLY output the fix for the given file.",
            "file_path": file_path,
            "failing_line": failing_line,
            "relevant_code_snippet": source_code,
            "error_log": error_log
        })
        
        for attempt in range(self.max_retries):
            print(f"Debug Attempt {attempt + 1}/{self.max_retries} for {file_path}")
            
            output_json_str = self.debug_agent.run(input_payload)
            
            # Defensive JSON extraction in case LLM wraps it in markdown blocks
            if "```json" in output_json_str:
                 output_json_str = output_json_str.split("```json")[1].split("```")[0].strip()
            elif "```" in output_json_str:
                 output_json_str = output_json_str.split("```")[1].split("```")[0].strip()
                 
            try:
                patch_data = json.loads(output_json_str)
                if self._validate_patch(patch_data):
                    print(f"✅ Valid patch received on attempt {attempt + 1}")
                    # In a real run, telemetry goes to Supabase here
                    return patch_data
                else:
                    print("❌ LLM returned invalid patch structure. Retrying.")
            except json.JSONDecodeError:
                print("❌ LLM returned malformed JSON. Retrying.")
            
            # Exponential backoff
            if attempt < self.max_retries - 1:
                sleep_time = self.base_backoff_sec * (2 ** attempt)
                print(f"Applying backoff for {sleep_time}s...")
                time.sleep(sleep_time)
                
        print("🚨 Max retries exceeded. Debug failed.")
        return None
