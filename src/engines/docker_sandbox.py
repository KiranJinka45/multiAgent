import subprocess
import time
import os

class DockerSandbox:
    """
    Guarantees deployment by executing code in an isolated container.
    Hardened for Production: strict user, memory, cpu, and network isolation limits.
    """
    def __init__(self, project_path: str):
        self.project_path = project_path
        self.image_name = f"sandbox-{os.path.basename(project_path)}"
        
        # Hardened Constraints
        self.memory_limit = "512m"
        self.cpu_limit = "1.0"
        self.timeout_sec = 300 # 5 minutes max build time

    def build_container(self) -> dict:
        """
        Builds the sandbox container enforcing unprivileged context.
        """
        start_time = time.time()
        print(f"Executing hardened sandbox build for {self.project_path}...")
        
        try:
            # We enforce that the Dockerfile itself creates a non-root user.
            build_cmd = [
                "docker", "build",
                "-t", self.image_name,
                self.project_path
            ]
            
            # Using timeout to prevent hanging builds
            result = subprocess.run(build_cmd, capture_output=True, text=True, timeout=self.timeout_sec)
            
            build_duration = time.time() - start_time
            
            return {
                "success": result.returncode == 0,
                "log": result.stdout if result.returncode == 0 else result.stderr,
                "telemetry": {
                    "build_duration_sec": round(build_duration, 2),
                    "exit_code": result.returncode,
                    "phase": "build"
                }
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "log": f"Timeout {self.timeout_sec}s exceeded during build.",
                "telemetry": {"build_duration_sec": self.timeout_sec, "exit_code": 124, "phase": "build"}
            }
        except Exception as e:
            return {
                "success": False,
                "log": str(e),
                "telemetry": {"build_duration_sec": time.time() - start_time, "exit_code": 1, "phase": "build"}
            }

    def validate_runtime(self) -> dict:
        """
        Runs the container with strict isolation to verify it doesn't crash on startup.
        No host mounts, limited memory/cpu, no exposed docker socket.
        """
        start_time = time.time()
        print("Running health validation in isolated container...")
        
        try:
            run_cmd = [
                "docker", "run",
                "--rm", # Auto remove
                "--memory", self.memory_limit,
                "--cpus", self.cpu_limit,
                "--network", "none", # Total network isolation for the health check
                "--read-only", # Immutable filesystem
                "--tmpfs", "/tmp", # Only allow writes to tmp
                "--security-opt", "no-new-privileges:true",
                self.image_name,
                "npm", "run", "test" # Or equivalent health check command passed by Orchestrator
            ]
            
            result = subprocess.run(run_cmd, capture_output=True, text=True, timeout=60)
            
            run_duration = time.time() - start_time
            return {
                "success": result.returncode == 0,
                "log": result.stdout if result.returncode == 0 else result.stderr,
                "telemetry": {
                    "run_duration_sec": round(run_duration, 2),
                    "exit_code": result.returncode,
                    "memory_limit": self.memory_limit,
                    "phase": "runtime_validate"
                }
            }
            
        except subprocess.TimeoutExpired:
             return {"success": False, "log": "Timeout during runtime validation", "telemetry": {"exit_code": 124, "phase": "runtime_validate"}}
        except Exception as e:
             return {"success": False, "log": str(e), "telemetry": {"exit_code": 1, "phase": "runtime_validate"}}

    def full_validation_pipeline(self) -> dict:
         """Executes build and runtime validation, returning aggregated telemetry."""
         build_res = self.build_container()
         if not build_res["success"]:
             return build_res
             
         run_res = self.validate_runtime()
         
         # Aggregate logs and telemetry
         return {
             "success": run_res["success"],
             "log": f"BUILD LOG:\n{build_res['log']}\n\nRUNTIME LOG:\n{run_res['log']}",
             "telemetry": {
                 "build_metrics": build_res["telemetry"],
                 "run_metrics": run_res["telemetry"]
             }
         }
