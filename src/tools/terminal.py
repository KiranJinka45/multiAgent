import subprocess
import shlex
from typing import Optional

def run_terminal_command(command: str, cwd: Optional[str] = None) -> str:
    """
    Executes a terminal command and returns the output.
    """
    try:
        # Split command string into args for subprocess
        args = shlex.split(command)
        
        result = subprocess.run(
            args,
            cwd=cwd,
            capture_output=True,
            text=True,
            check=False # We want to capture error output, not raise exception
        )
        
        output = result.stdout
        if result.stderr:
            output += f"\nSTDERR:\n{result.stderr}"
            
        return output.strip()
    except Exception as e:
        return f"Error executing command: {str(e)}"
