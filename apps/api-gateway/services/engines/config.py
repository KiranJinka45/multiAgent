# AI Orchestrator OS - Global Tightening Constants
# Phase 5.5: Prioritize Stability & Predictable CPU Load

class OrchestratorConfig:
    
    # --- CONCURRENCY GUARD ---
    # Dropped from 5 to 3 to prevent memory spikes & docker stalls
    MAX_CONCURRENT_BUILDS = 3 
    
    # If the queue exceeds this, we send back a 429 Too Many Requests response
    MAX_QUEUE_LENGTH = 10 
    
    # --- RETRY GUARD ---
    # Dropped from 3 to 2. If it takes 3 retries, the architecture was likely flawed 
    # and we are wasting tokens loops. Fail fast instead.
    MAX_DEBUG_RETRIES = 2 
    
    # --- GRACEFUL FAILURE MESSAGES ---
    FAIL_FAST_MSG = "System exhausted allowed debug loops (2). Failing gracefully to protect margin and infrastructure."
    RATE_LIMIT_MSG = "Orchestrator at maximum stability load. Queue is full. Please retry in 5 minutes."
