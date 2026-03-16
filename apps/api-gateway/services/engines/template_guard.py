import hashlib
import os

class TemplateIntegrityGuard:
    """
    Cryptographically hashes the 'src/templates' directory before 
    every build to ensure LLMs or chaotic users haven't mutated
    the baseline architecture.
    """
    
    # In production, this would be computed once at startup and stored in memory.
    _BASELINE_HASH = None
    
    def __init__(self, templates_dir: str):
        self.templates_dir = templates_dir
        if not TemplateIntegrityGuard._BASELINE_HASH:
             TemplateIntegrityGuard._BASELINE_HASH = self._compute_dir_hash(templates_dir)

    def _compute_dir_hash(self, directory: str) -> str:
        """Recursively hashes all files in the given directory."""
        hasher = hashlib.sha256()
        
        if not os.path.exists(directory):
             return hasher.hexdigest()
             
        for root, dirs, files in os.walk(directory):
            for file in sorted(files):
                filepath = os.path.join(root, file)
                try:
                     with open(filepath, 'rb') as f:
                          while chunk := f.read(8192):
                              hasher.update(chunk)
                except Exception as e:
                     print(f"Failed to hash {filepath}: {e}")
                     # Any read error changes the hash state
                     hasher.update(str(e).encode('utf-8'))
                     
        return hasher.hexdigest()

    def verify_integrity(self) -> bool:
        """Verifies the live template directory matches the baseline signature."""
        current_hash = self._compute_dir_hash(self.templates_dir)
        is_valid = current_hash == TemplateIntegrityGuard._BASELINE_HASH
        
        if not is_valid:
             print("🚨 FATAL SECURITY ERROR: Template Integrity check failed. Files were modified silently.")
             # Trigger hard halt in Orchestrator
             
        return is_valid
