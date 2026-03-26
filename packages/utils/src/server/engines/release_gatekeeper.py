import json
from typing import Dict, Any

class ReleaseGatekeeper:
    """
    Enforces Hard PASS/FAIL logic for the Orchestrator AI.
    Blocks State Transitions (e.g., to Alpha or Beta) if statistical thresholds are not met.
    """
    
    THRESHOLDS = {
        "alpha": {
            "build_success_rate": 0.90,
            "deployment_success_rate": 0.95,
            "auto_classification_rate": 0.70,
            "max_avg_retry_count": 2.0,
            "min_reliability_index": 0.80
        },
        "beta": {
            "build_success_rate": 0.95,
            "deployment_success_rate": 0.97,
            "auto_classification_rate": 0.80, # Implicitly asking for better classification
            "max_avg_retry_count": 1.5,
            "min_reliability_index": 0.88
        }
    }

    def evaluate_release(self, target_state: str, ri_report: Dict[str, Any], raw_metrics: Dict[str, float]) -> Dict[str, Any]:
        """
        Evaluates the current reliability against the hard thresholds for the target state.
        """
        if target_state not in self.THRESHOLDS:
             return {"approved": False, "reason": f"Unknown target state: {target_state}"}
             
        thresholds = self.THRESHOLDS[target_state]
        metrics = ri_report.get("metrics", {})
        
        failures = []
        
        # 1. Build Success
        if metrics.get("build_success_rate", 0) < thresholds["build_success_rate"]:
             failures.append(f"BuildSuccessRate ({metrics.get('build_success_rate')}) < required ({thresholds['build_success_rate']})")
             
        # 2. Deployment Success
        if metrics.get("deployment_success_rate", 0) < thresholds["deployment_success_rate"]:
             failures.append(f"DeploymentSuccessRate ({metrics.get('deployment_success_rate')}) < required ({thresholds['deployment_success_rate']})")

        # 3. Auto-Classification Rate
        if metrics.get("auto_classification_rate", 0) < thresholds["auto_classification_rate"]:
             failures.append(f"AutoClassificationRate ({metrics.get('auto_classification_rate')}) < required ({thresholds['auto_classification_rate']})")

        # 4. Avg Retry Count
        if raw_metrics.get("avg_retry_count", 99) > thresholds["max_avg_retry_count"]:
             failures.append(f"AvgRetryCount ({raw_metrics.get('avg_retry_count')}) > allowed ({thresholds['max_avg_retry_count']})")
             
        # 5. Reliability Index
        if ri_report.get("reliability_index", 0) < thresholds["min_reliability_index"]:
             failures.append(f"ReliabilityIndex ({ri_report.get('reliability_index')}) < required ({thresholds['min_reliability_index']})")

        is_approved = len(failures) == 0
        
        if not is_approved:
             print(f"🚨 RELEASE GATEKEEPER BLOCKED TRANSITION TO '{target_state.upper()}' 🚨")
             for f in failures:
                  print(f"  - {f}")
        else:
             print(f"✅ RELEASE GATEKEEPER APPROVED TRANSITION TO '{target_state.upper()}' ✅")

        return {
            "target_state": target_state,
            "approved": is_approved,
            "failures": failures,
            "current_index": ri_report.get("reliability_index")
        }
