import os
import re

agents_dir = r"C:\multiAgentic_system\MultiAgent\agents"

replacements = [
    (re.compile(r"import logger from ['\"]\.\./config/logger['\"]"), "import logger from '@config/logger'"),
    (re.compile(r"import { AgentContext } from ['\"]\.\./types/agent-context['\"]"), "import { AgentContext } from '@shared-types/agent-context'"),
    (re.compile(r"import { eventBus } from ['\"]\.\./services/event-bus['\"]"), "import { eventBus } from '@services/event-bus'"),
    (re.compile(r"import { RetryManager } from ['\"]\.\./services/retry-manager['\"]"), "import { RetryManager } from '@services/retry-manager'"),
    (re.compile(r"import { StrategyConfig } from ['\"]\.\./services/agent-intelligence/strategy-engine['\"]"), "import { StrategyConfig } from '@services/agent-intelligence/strategy-engine'"),
    (re.compile(r"import { StrategyConfig } from ['\"]\.\./shared/strategy-engine['\"]"), "import { StrategyConfig } from '@services/agent-intelligence/strategy-engine'"),
    (re.compile(r"from ['\"]\./base-agent['\"]"), "from '@agents/base-agent'"),
]

for filename in os.listdir(agents_dir):
    if filename.endswith(".ts"):
        path = os.path.join(agents_dir, filename)
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        
        new_content = content
        for pattern, replacement in replacements:
            new_content = pattern.sub(replacement, new_content)
        
        if new_content != content:
            with open(path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Fixed {filename}")
