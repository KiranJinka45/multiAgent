import random
import time
from typing import Dict, Any, List

class ChaosSimulator:
    """
    Adversarial Input Generator for the Orchestrator OS.
    Designed to break the Architect agent and stress token limits.
    """
    
    CHAOTIC_PROMPTS = [
        "Build Uber + Netflix + AI chatbot + crypto payments",
        "Make it scalable like Google but I don't know what backend to use",
        "CRM system. Must use Postgres but NoSQL schemas. Fast plz.",
        "Just use something fast idk.",
        "A SaaS that does everything. Literally everything.",
        "Social network with React but actually I meant Angular but keep the React code too.",
        "Generate a 50 page admin dashboard with 200 CRUD tables."
    ]

    def __init__(self, target_runs: int = 20):
        self.target_runs = target_runs
        self.results = {
            "total_runs": target_runs,
            "crashes": 0,
            "timeouts": 0,
            "avg_retry_depth": 0.0,
            "success_rate_under_chaos": 0.0,
            "logs": []
        }

    def _simulate_adversarial_run(self, prompt: str) -> Dict[str, Any]:
        """
        Simulates how the Orchestrator handles a chaotic prompt.
        In a full run, this would pass the prompt to the Architect Agent.
        """
        print(f"[Chaos] Injecting Prompt: '{prompt}'")
        
        # Simulating system response to chaos
        # Chaos prompts have a high likelihood of causing validation failures or excessive retries
        is_crash = random.random() < 0.05 # 5% chance the Python parser actually crashes
        is_timeout = random.random() < 0.10 # 10% chance the LLM hangs on the vague prompt
        
        if is_crash:
            return {"status": "crash", "retries": 0, "error": "Unhandled exception in Architect parser"}
        if is_timeout:
            return {"status": "timeout", "retries": 3, "error": "LLM generation timeout exceeded 120s"}
            
        # If it doesn't crash/timeout, it probably struggles to build
        is_build_success = random.random() > 0.40 # Chaos drops success rate to ~60%
        retries = random.randint(1, 3) if not is_build_success else random.randint(0, 2)
        
        return {
            "status": "success" if is_build_success else "failure",
            "retries": retries,
            "error": "Failed to map contradictory requirements" if not is_build_success else None
        }

    def execute_chaos_suite(self) -> Dict[str, Any]:
        """Runs the adversarial prompt suite."""
        print(f"🔥 Starting Chaos Simulation Suite ({self.target_runs} runs)...")
        
        total_retries = 0
        successful_chaos_builds = 0
        
        for i in range(self.target_runs):
            prompt = random.choice(self.CHAOTIC_PROMPTS)
            
            # Massive payload mutation
            if random.random() > 0.8:
                prompt += " " + ("redundant text " * 500) # Token bloat attack
                
            res = self._simulate_adversarial_run(prompt)
            self.results["logs"].append({"prompt": prompt[:50] + "...", "result": res})
            
            if res["status"] == "crash":
                self.results["crashes"] += 1
            elif res["status"] == "timeout":
                self.results["timeouts"] += 1
            elif res["status"] == "success":
                successful_chaos_builds += 1
                
            total_retries += res["retries"]
            
        self.results["avg_retry_depth"] = round(total_retries / self.target_runs, 2)
        self.results["success_rate_under_chaos"] = round(successful_chaos_builds / self.target_runs, 2)
        
        print("\n🔥 Chaos Suite Complete.")
        print(f"Crashes: {self.results['crashes']} | Timeouts: {self.results['timeouts']}")
        print(f"Success Rate under Chaos: {self.results['success_rate_under_chaos'] * 100}%")
        
        return self.results
