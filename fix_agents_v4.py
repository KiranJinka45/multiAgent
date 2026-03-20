import os
import re

agents_src = r"c:\multiagentic_project\multiAgent-main\packages\agents\src"

def fix_file(file_path):
    with open(file_path, 'r', encoding='utf-8-sig') as f:
        content = f.read()
    
    is_in_services = 'services' in file_path
    rel_prefix = '../' if is_in_services else './'
    
    # 1. Replace @agents/ with relative
    new_content = re.sub(r'["\']@agents/([^"\']+)["\']', rf"'{rel_prefix}\1'", content)
    
    # 2. Specifically fix agent-registry.ts to avoid circular index import
    if 'agent-registry.ts' in file_path:
        # Resolve from individual files instead of @libs/agents index
        agents_to_fix = [
            'DatabaseAgent', 'BackendAgent', 'FrontendAgent', 'DeploymentAgent',
            'TestingAgent', 'ValidatorAgent', 'PlannerAgent', 'SecurityAgent',
            'MonitoringAgent', 'DebugAgent', 'JudgeAgent'
        ]
        for agent in agents_to_fix:
            # Match: import { AgentName } from '@libs/agents'
            # Or: import { ..., AgentName, ... } from '@libs/agents'
            # Simplest: Replace the whole '@libs/agents' with the specific file if it's a single import
            # But the file has multiple single imports.
            pass
        
        # Brute force for agent-registry.ts
        new_content = new_content.replace("from '@libs/agents'", "from '..'") # index is better but relative file is safest
        # Actually, if I replace '@libs/agents' with '..' it points to index.ts
        # Let's try pointing to specific files for these common ones
        
        mapping = {
            'DatabaseAgent': 'database-agent',
            'BackendAgent': 'backend-agent',
            'FrontendAgent': 'frontend-agent',
            'DeploymentAgent': 'deploy-agent', # Note: filename is deploy-agent.ts
            'TestingAgent': 'testing-agent',
            'ValidatorAgent': 'validator-agent',
            'PlannerAgent': 'planner-agent',
            'SecurityAgent': 'security-agent',
            'MonitoringAgent': 'monitoring-agent',
            'DebugAgent': 'debug-agent',
            'JudgeAgent': 'judge-agent'
        }
        for cls, filename in mapping.items():
            new_content = re.sub(rf'import \{{ ({cls}) \}} from [\'"]@libs/agents[\'"]', rf"import {{ \1 }} from '../{filename}'", new_content)

    # 3. Generic @libs/agents handle for other files
    new_content = re.sub(r'["\']@libs/agents["\']', rf"'{rel_prefix}index'", new_content)

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

for root, dirs, files in os.walk(agents_src):
    for file in files:
        if file.endswith('.ts'):
            fix_file(os.path.join(root, file))
