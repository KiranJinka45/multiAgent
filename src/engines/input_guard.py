import json
from typing import Dict, Any

class ArchitectInputGuard:
    """
    Validates user prompts BEFORE they hit the LLM.
    Enforces strict SaaS CRUD scope, caps payload size, 
    and blocks ambiguous parameters.
    """
    
    MAX_PROMPT_LENGTH_CHARS = 2000
    REQUIRED_KEYWORDS = ["SaaS", "CRUD", "Spring Boot", "Angular", "Postgres"]
    BANNED_KEYWORDS = ["Google", "Uber", "Netflix", "clone", "everything", "NoSQL", "idk", "React", "Vue"]

    def validate_prompt(self, user_prompt: str) -> Dict[str, Any]:
        """
        Runs the pre-flight checks on user inputs.
        If any fail, returns a graceful rejection immediately 
        without spending any LLM tokens.
        """
        
        # 1. Size Cap
        if len(user_prompt) > self.MAX_PROMPT_LENGTH_CHARS:
            return {
                "valid": False, 
                "reason": f"Prompt length ({len(user_prompt)} chars) exceeds maximum allowed ({self.MAX_PROMPT_LENGTH_CHARS}). Please provide a concise SaaS spec."
            }
            
        # 2. Ambiguity & Unpredictability Check
        prompt_lower = user_prompt.lower()
        for banned in self.BANNED_KEYWORDS:
            if banned.lower() in prompt_lower:
                return {
                    "valid": False,
                    "reason": f"Invalid request. This platform strictly builds SaaS CRUD tools. Ambiguous scopes ('{banned}') are currently rejected to guarantee stability."
                }
                
        # 3. Require Structured Confirmation 
        # (Mocking the verification that the user understands the stack bounds)
        tech_hits = sum(1 for kw in self.REQUIRED_KEYWORDS if kw.lower() in prompt_lower)
        if tech_hits == 0:
             return {
                 "valid": False,
                 "reason": "Missing structured parameters. Please confirm you want a Spring Boot + Angular + Postgres SaaS CRUD application."
             }

        # Passed Guard
        print("✅ Architect Input Guard: Prompt validated successfully.")
        return {"valid": True, "reason": None}
