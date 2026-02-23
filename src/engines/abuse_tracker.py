import json
from typing import Dict, Any

class StructuredFailureFormatter:
    """
    Ensures that when the system inevitably fails during Phase 5.6 abuse,
    it returns a clean, structured JSON object outlining EXACTLY why it died.
    Raw stack traces are never exposed to the User/Founder output.
    """
    
    def format_failure(self, stage: str, category: str, retry_count: int, tokens: int, hypothesis: str, guard_triggered: bool) -> str:
        """
        Builds the standard orchestrator failure payload.
        """
        payload = {
            "status": "failed",
            "failure_details": {
                "stage_failed": stage,
                "error_category": category,
                "retry_count": retry_count,
                "token_usage": tokens,
                "root_cause_hypothesis": hypothesis,
                "system_guard_triggered": guard_triggered
            }
        }
        
        return json.dumps(payload, indent=2)

    def extract_and_format_exception(self, raw_exception: Exception, stage: str, tokens: int = 0) -> str:
        """
        Helper for catastrophic unhandled Python orchestrator crashes.
        """
        error_msg = str(raw_exception)
        
        # Simple clustering based on standard errors
        category = "unhandled_orchestrator_exception"
        if "Timeout" in error_msg:
             category = "docker_timeout"
        elif "JSON" in error_msg:
             category = "llm_hallucination"
             
        return self.format_failure(
            stage=stage,
            category=category,
            retry_count=0,
            tokens=tokens,
            hypothesis=f"System failed catastrophically due to: {error_msg[:100]}...",
            guard_triggered=False
        )
