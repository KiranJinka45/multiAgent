import time
from typing import Dict, Any

class ProductionMonitor:
    """
    Lightweight telemetry hook system to detect anomalies in production.
    Tracks latency, retries, tokens, and deployment stability in real-time.
    """
    
    # Critical Alert Thresholds
    THRESHOLDS = {
        "max_build_latency_sec": 300, # 5 Mins
        "max_retry_explosion": 5, # If a single build loops 5 times
        "token_anomaly_limit": 50000, # If a single project uses >50k tokens
        "deployment_instability_rate": 0.15 # If >15% deployments fail in a 1 hr window
    }

    def __init__(self):
        self.alerts = []

    def check_build_latency(self, project_id: str, duration_sec: int) -> None:
        """Hook fired after build completion to check for stalls."""
        if duration_sec > self.THRESHOLDS["max_build_latency_sec"]:
            msg = f"LATENCY SPIKE: {project_id} build took {duration_sec}s (> {self.THRESHOLDS['max_build_latency_sec']}s limit)."
            self.alerts.append(msg)
            print(f"🚨 ALERT: {msg}")

    def check_retry_explosion(self, project_id: str, total_retries: int) -> None:
        """Hook fired during debug loops."""
        if total_retries >= self.THRESHOLDS["max_retry_explosion"]:
            msg = f"RETRY EXPLOSION: {project_id} caught in recursive fix loop ({total_retries} attempts)."
            self.alerts.append(msg)
            print(f"🚨 ALERT: {msg}")

    def check_token_velocity(self, project_id: str, tokens_used: int) -> None:
        """Hook fired during prompt generation to stop runaway costs."""
        if tokens_used > self.THRESHOLDS["token_anomaly_limit"]:
            msg = f"TOKEN ANOMALY: {project_id} consumed {tokens_used} tokens. Margin danger."
            self.alerts.append(msg)
            print(f"🚨 ALERT: {msg}")
            
    def check_system_stability(self, recent_deploy_success_rate: float) -> bool:
         """Global hook to assess if the system should pause incoming traffic."""
         failure_rate = 1.0 - recent_deploy_success_rate
         if failure_rate > self.THRESHOLDS["deployment_instability_rate"]:
             msg = f"SYSTEM UNSTABLE: Deployment failure rate hit {failure_rate*100}%."
             self.alerts.append(msg)
             print(f"🚨 CRITICAL ALERT: {msg}. Halting new build queue.")
             return False # Unstable
         return True # Stable
         
    def get_active_alerts(self) -> list:
        return self.alerts
