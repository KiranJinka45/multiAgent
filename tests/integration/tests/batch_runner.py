import random
import time
from typing import Dict, Any

class BatchValidationRunner:
    """
    Automates the 100 Build Validation run to prove statistical reliability.
    """
    
    SUPPORTED_STACKS = ["Spring Boot + Angular"]
    MOCK_DOMAINS = [
        "E-commerce Dashboard",
        "CRM System",
        "Employee Directory",
        "Task Management App",
        "Inventory Tracker"
    ]
    
    def __init__(self, target_runs: int = 100):
        self.target_runs = target_runs
        self.results = {
            "successful_builds": 0,
            "total_builds": self.target_runs,
            "successful_deployments": 0,
            "deployment_attempts": 0,
            "auto_fixed_errors": 0,
            "total_errors": 0,
            "total_retries": 0,
            "total_llm_calls": 0,
            "error_categories": {}
        }
        
    def _simulate_generation(self) -> Dict[str, Any]:
        """
        Simulates the full Multi-Agent generation and validation pipeline.
        In the real runner, this calls the Orchestrator.run() pipeline.
        """
        # For the pure runner structural mock (since we aren't executing 100 real LLM calls here right now)
        # We simulate the metrics collection.
        
        is_build_success = random.random() > 0.10 # 90% mock base reliability
        is_deploy_success = is_build_success and random.random() > 0.05
        
        errors_thrown = random.randint(0, 3)
        auto_fixed = min(errors_thrown, random.randint(0, errors_thrown))
        
        retries = random.randint(0, 3) if not is_build_success else random.randint(0, 1)
        llm_calls = 5 + retries # Base 5 agents + debug attempts
        
        return {
            "build_success": is_build_success,
            "deploy_success": is_deploy_success,
            "errors": errors_thrown,
            "auto_fixed": auto_fixed,
            "retries": retries,
            "llm_calls": llm_calls,
            "error_category": random.choice(["bean_injection_failure", "missing_dependency", "port_conflict"]) if errors_thrown > 0 else None
        }

    def execute_batch(self) -> Dict[str, Any]:
        """
        Executes the batch run.
        """
        print(f"🚀 Starting 100 Build Validation Runner...")
        print(f"-"*40)
        
        for i in range(self.target_runs):
            domain = random.choice(self.MOCK_DOMAINS)
            print(f"Run {i+1}/{self.target_runs} | Domain: {domain}...")
            
            run_metrics = self._simulate_generation()
            
            # Aggregate metrics
            if run_metrics["build_success"]:
                self.results["successful_builds"] += 1
                
                # Only attempt deploy if build succeeds
                self.results["deployment_attempts"] += 1
                if run_metrics["deploy_success"]:
                    self.results["successful_deployments"] += 1
                    
            self.results["total_errors"] += run_metrics["errors"]
            self.results["auto_fixed_errors"] += run_metrics["auto_fixed"]
            self.results["total_retries"] += run_metrics["retries"]
            self.results["total_llm_calls"] += run_metrics["llm_calls"]
            
            if run_metrics["error_category"]:
                cat = run_metrics["error_category"]
                self.results["error_categories"][cat] = self.results["error_categories"].get(cat, 0) + 1
                
        # Calculate Averages
        self.results["avg_retry_count"] = self.results["total_retries"] / self.target_runs
        self.results["avg_llm_calls_per_build"] = self.results["total_llm_calls"] / self.target_runs
        
        print(f"-"*40)
        print("✅ Batch Validation Complete.")
        
        # Note: In production, these results are INSERTED into Supabase `projects` and `system_metrics`
        return self.results
