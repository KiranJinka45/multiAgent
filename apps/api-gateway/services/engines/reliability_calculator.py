import json
from typing import Dict, Any

class ReliabilityCalculator:
    """
    Computes the statistical Reliability Index (RI) for the AI Orchestrator.
    Formula:
    RI = (0.4 * BuildSuccessRate) +
         (0.2 * DeploymentSuccessRate) +
         (0.15 * AutoClassificationRate) +
         (0.15 * RetryEfficiency) +
         (0.1 * TokenEfficiency)
    """
    
    def __init__(self, max_retry_limit: int = 3, max_allowed_llm_calls: int = 5):
        self.max_retry_limit = max_retry_limit
        self.max_allowed_llm_calls = max_allowed_llm_calls

    def calculate_index(self, metrics: Dict[str, float]) -> Dict[str, Any]:
        """
        Receives raw metrics and computes the RI.
        Expected metrics dictionary:
        {
            "successful_builds": float,
            "total_builds": float,
            "successful_deployments": float,
            "deployment_attempts": float,
            "auto_fixed_errors": float,
            "total_errors": float,
            "avg_retry_count": float,
            "avg_llm_calls_per_build": float
        }
        """
        
        # 1. Build Success Rate (Weight: 40%)
        total_builds = max(metrics.get("total_builds", 0), 1)  # Prevent div by zero
        build_success_rate = metrics.get("successful_builds", 0) / total_builds
        
        # 2. Deployment Success Rate (Weight: 20%)
        deploy_attempts = max(metrics.get("deployment_attempts", 0), 1)
        deployment_success_rate = metrics.get("successful_deployments", 0) / deploy_attempts
        
        # 3. Auto Classification Rate (Weight: 15%)
        total_errors = max(metrics.get("total_errors", 0), 1)
        auto_classification_rate = metrics.get("auto_fixed_errors", 0) / total_errors
        # Handle case where there are no errors (perfect run)
        if metrics.get("total_errors", 0) == 0:
            auto_classification_rate = 1.0
            
        # 4. Retry Efficiency (Weight: 15%)
        avg_retry = min(metrics.get("avg_retry_count", 0), self.max_retry_limit)
        retry_efficiency = max(0.0, 1.0 - (avg_retry / self.max_retry_limit))
        
        # 5. Token Efficiency (Weight: 10%)
        avg_llm_calls = min(metrics.get("avg_llm_calls_per_build", 0), self.max_allowed_llm_calls)
        token_efficiency = max(0.0, 1.0 - (avg_llm_calls / self.max_allowed_llm_calls))
        
        # Compute final weighted RI
        reliability_index = (
            (0.40 * build_success_rate) +
            (0.20 * deployment_success_rate) +
            (0.15 * auto_classification_rate) +
            (0.15 * retry_efficiency) +
            (0.10 * token_efficiency)
        )
        
        return {
            "metrics": {
                "build_success_rate": round(build_success_rate, 4),
                "deployment_success_rate": round(deployment_success_rate, 4),
                "auto_classification_rate": round(auto_classification_rate, 4),
                "retry_efficiency": round(retry_efficiency, 4),
                "token_efficiency": round(token_efficiency, 4)
            },
            "reliability_index": round(reliability_index, 4)
        }
