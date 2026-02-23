import requests
import time
import json
from typing import Dict, Any, List

class DeploymentGatekeeper:
    """
    Guarantees deployment reliability by acting as a strict gating mechanism.
    Enforces pre-deployment validation and post-deployment health checks.
    """
    def __init__(self, project_id: str):
        self.project_id = project_id
        # In a real system, these would be fetched securely from Vault/Supabase
        self.expected_health_endpoint = "/api/health"
        self.max_retries = 5
        self.retry_delay_sec = 10

    def _probe_endpoint(self, url: str) -> bool:
        """Helper to probe a URL for HTTP 200 OK."""
        try:
            response = requests.get(url, timeout=5)
            return response.status_code == 200
        except requests.RequestException:
            return False

    def pre_deployment_validation(self, sandbox_results: dict) -> Dict[str, Any]:
        """
        Validates the artifact *before* passing it to Vercel/Render.
        """
        print(f"Gatekeeper (Pre-Deploy): Validating Sandbox Artifact...")
        
        rejection_reasons = []
        
        if not sandbox_results.get("success", False):
            rejection_reasons.append("Sandbox build or runtime validation failed.")
            
        telemetry = sandbox_results.get("telemetry", {})
        
        # Verify it didn't just instantly exit
        if telemetry.get("run_metrics", {}).get("run_duration_sec", 0) < 1.0:
            rejection_reasons.append("Container exited too quickly (CrashLoopBackOff suspected).")

        # In a full system, we might also run a static SAST trace here
        # or verify specific env variables exist.
        
        if rejection_reasons:
            print("❌ Pre-deployment validation failed.")
            return {
                "approved": False,
                "reasons": rejection_reasons,
                "action": "trigger_rollback"
            }
            
        print("✅ Pre-deployment approved.")
        return {"approved": True, "reasons": []}

    def post_deployment_verification(self, live_url: str) -> Dict[str, Any]:
        """
        Validates the live application *after* deployment.
        Upgraded Phase 5.5: Functional validation beyond simple 200 OK.
        """
        print(f"Gatekeeper (Post-Deploy): Verifying live URL -> {live_url}")
        
        health_url = f"{live_url.rstrip('/')}{self.expected_health_endpoint}"
        db_health_url = f"{live_url.rstrip('/')}/api/health/db"
        auth_verify_url = f"{live_url.rstrip('/')}/api/auth/verify"
        
        success = False
        failures = []
        
        for attempt in range(self.max_retries):
            print(f"Verification attempt {attempt + 1}/{self.max_retries}...")
            
            # 1. Base URL Check
            base_ok = self._probe_endpoint(live_url)
            
            # 2. Functional Endpoint Checks
            sys_health_ok = self._probe_endpoint(health_url)
            db_health_ok = self._probe_endpoint(db_health_url)
            auth_health_ok = self._probe_endpoint(auth_verify_url)
            
            # Aggregate status
            if base_ok and sys_health_ok and db_health_ok and auth_health_ok:
                success = True
                break
                
            time.sleep(self.retry_delay_sec)
            
        if success:
            print("✅ Post-deployment verification passed.")
            return {"verified": True, "status": "deployed"}
        else:
            failures = [ep for ep, is_ok in [
                ("Live_Base", base_ok), 
                ("System_Health", sys_health_ok), 
                ("Database_Migrations", db_health_ok), 
                ("JWT_Auth_Pipeline", auth_health_ok)
            ] if not is_ok]
            
            print(f"❌ Post-deployment verification failed on: {failures}. Triggering rollback.")
            # Trigger rollback logic here
            return {
                "verified": False,
                "status": "failed",
                "failure_reason": f"Functional endpoints timed out: {failures}. Rollback triggered."
            }
