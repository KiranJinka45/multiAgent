import json
from typing import Dict, Any

class AbuseStabilityCalculator:
    """
    Computes the Abuse Stability Score (ASS) during Founder Abuse Mode.
    Formula:
    ASS = (0.5 * BuildSurvivalRate) +
          (0.2 * DeploymentSurvivalRate) +
          (0.15 * RetryControlScore) +
          (0.15 * TokenStabilityScore)
    Target: >= 0.75
    """
    
    def __init__(self, max_retry_limit: int = 2, max_tokens: int = 50000):
        self.max_retry_limit = max_retry_limit
        self.max_tokens = max_tokens

    def calculate_ass(self, metrics: Dict[str, float]) -> Dict[str, Any]:
        """
        Calculates how well the system survives intentional abuse.
        """
        # 1. Survival Rate (Did it fail gracefully or crash hard?)
        total_runs = max(metrics.get("total_abuse_runs", 0), 1)
        # Survival means it returned a JSON error or succeeded, but didn't hang/crash
        build_survival_rate = metrics.get("survived_runs", 0) / total_runs
        
        # 2. Deployment Survival
        deploy_attempts = max(metrics.get("abusive_deploy_attempts", 0), 1)
        deploy_survival = metrics.get("survived_deployments", 0) / deploy_attempts
        
        # 3. Retry Control (Did we hit infinite recursion?)
        # 1.0 means perfect control (avg = 0), 0.0 means we always maxed out retries
        avg_retries = min(metrics.get("avg_retry_depth", 0), self.max_retry_limit)
        retry_control = max(0.0, 1.0 - (avg_retries / self.max_retry_limit))
        
        # 4. Token Stability (Did an anomalous prompt drain tokens?)
        avg_tokens = min(metrics.get("avg_tokens_used", 0), self.max_tokens)
        token_stability = max(0.0, 1.0 - (avg_tokens / self.max_tokens))
        
        ass_score = (
            (0.50 * build_survival_rate) +
            (0.20 * deploy_survival) +
            (0.15 * retry_control) +
            (0.15 * token_stability)
        )
        
        return {
            "metrics": {
                "build_survival_rate": round(build_survival_rate, 4),
                "deployment_survival_rate": round(deploy_survival, 4),
                "retry_control_score": round(retry_control, 4),
                "token_stability_score": round(token_stability, 4)
            },
            "abuse_stability_score": round(ass_score, 4),
            "status": "READY_FOR_HUMANS" if ass_score >= 0.75 else "REQUIRES_TIGHTENING"
        }
