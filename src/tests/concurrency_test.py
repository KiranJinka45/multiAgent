import asyncio
import time
import random

class ConcurrencyStressTester:
    """
    Simulates concurrent build requests to test system queues, 
    Docker contention, and memory spikes.
    """
    def __init__(self, concurrent_users: int = 5):
        self.concurrent_users = concurrent_users
        self.results = {
            "total_requests": concurrent_users,
            "successful_completions": 0,
            "queue_blocks": 0,
            "docker_stalls": 0,
            "memory_spikes_detected": 0
        }

    async def _mock_build_task(self, task_id: int):
        """Simulates a heavy orchestrator pipeline task."""
        print(f"[Thread-{task_id}] Initiating Build Pipeline...")
        start_time = time.time()
        
        # Simulate initial LLM planning queue latency
        await asyncio.sleep(random.uniform(0.5, 2.0))
        
        # Simulate Docker contention
        is_docker_stalled = random.random() < 0.15 # 15% chance Docker hangs under load
        if is_docker_stalled:
            print(f"[Thread-{task_id}] ⚠️ Docker Daemon Stalled. Retrying...")
            self.results["docker_stalls"] += 1
            await asyncio.sleep(3.0) # Penalty
            
        # Simulate Memory spike out-of-memory kill
        if random.random() < 0.05:
            print(f"[Thread-{task_id}] 🚨 OOM Killed by Host!")
            self.results["memory_spikes_detected"] += 1
            return False

        # Simulate completion time
        await asyncio.sleep(random.uniform(1.0, 3.0))
        duration = round(time.time() - start_time, 2)
        print(f"[Thread-{task_id}] ✅ Build Complete in {duration}s")
        return True

    async def execute_stress_test(self):
        """Executes the concurrency suite using asyncio."""
        print(f"⚡ Starting Concurrency Test ({self.concurrent_users} parallel builds)...")
        start_time = time.time()
        
        tasks = [self._mock_build_task(i) for i in range(self.concurrent_users)]
        
        # Gather executes them concurrently
        completed_tasks = await asyncio.gather(*tasks)
        
        self.results["successful_completions"] = sum(1 for res in completed_tasks if res)
        
        total_duration = round(time.time() - start_time, 2)
        print(f"\n⚡ Concurrency Suite Complete in {total_duration}s.")
        print(f"Stats: {self.results}")
        
        if self.results["docker_stalls"] > 0 or self.results["memory_spikes_detected"] > 0:
            print("🚨 SYSTEM WARNING: Resource contention detected. Strict queue limits must be enforced via Celery/Redis.")
        else:
            print("✅ Concurrency Stable at current load.")
            
        return self.results

def run_test():
    tester = ConcurrencyStressTester(concurrent_users=5)
    asyncio.run(tester.execute_stress_test())

if __name__ == "__main__":
    run_test()
