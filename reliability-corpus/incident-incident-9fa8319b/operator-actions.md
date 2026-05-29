# Incident INCIDENT-9FA8319B - Forensic Replay Analysis

## Incident Parameters
*   **Incident ID**: INCIDENT-9FA8319B
*   **Timestamp**: 2026-05-28T03:27:09.887Z
*   **Failure Class**: STARTUP_ATTESTATION_ENV_DRIFT
*   **Confidence**: 0.95

## Observed Pathology
*   Initiating ZTAN node boot and startup attestation checks.
*   [ENV_AUDIT_ERROR] Shadow override variable detected: "unauthorized_proxy_override".
*   [OPA_REST_GATE_DENIAL] fail-closed OPA denial on write. Target role mismatch: operator "rogue_operator" is not allowed.
*   [STORAGE_MERKLE_CHAIN_ERROR] Lineage integrity break on Ledger block #22. Expected prevHash mismatch.
*   FATAL: Core runtime invariants failed attestation. Quarantine lockdown activated.

## Captured Environment
*   **Hashed Environment Keys**: AICC_API_KEY, ALLUSERSPROFILE, APPDATA, AUTH_SERVICE_PORT, CEREBRAS_API_KEY, CERTIFICATION_MODE, CLUSTER_WORKERS, COLOR, CommonProgramFiles, CommonProgramFiles(x86), CommonProgramW6432, COMPUTERNAME, ComSpec, CORE_API_PORT, CORE_ENGINE_PORT, CORE_ENGINE_URL, DATABASE_URL, DEFAULT_EMBEDDING_MODEL, DriverData, EDITOR, FRONTEND_PORT, GATEWAY_PORT, GEMINI_API_KEY, GROQ_API_KEY, HOME, HOMEDRIVE, HOMEPATH, INIT_CWD, INTERNAL_SERVICE_TOKEN, JAVA_HOME, JWT_SECRET, JWT_SECRET_KEY, LLM_PROVIDER, LOCALAPPDATA, LOGONSERVER, MISTRAL_API_KEY, MOCK_DB, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, NODE, NODE_ENV, NODE_EXE, NO_CLUSTER, npm_command, npm_config_cache, npm_config_confirmmodulespurge, npm_config_globalconfig, npm_config_global_prefix, npm_config_init_module, npm_config_local_prefix, npm_config_node_gyp, npm_config_node_linker, npm_config_noproxy, npm_config_npm_version, npm_config_prefix, npm_config_scripts_prepend_node_path, npm_config_shamefully_hoist, npm_config_userconfig, npm_config_user_agent, npm_execpath, npm_lifecycle_event, npm_lifecycle_script, npm_node_execpath, npm_package_engines_node, npm_package_engines_pnpm, npm_package_json, npm_package_name, npm_package_version, NPM_PREFIX_JS, NPM_PREFIX_NPX_CLI_JS, NPX_CLI_JS, NUMBER_OF_PROCESSORS, OneDrive, OneDriveConsumer, OPENAI_API_KEY, OS, path, PATHEXT, PROCESSOR_ARCHITECTURE, PROCESSOR_IDENTIFIER, PROCESSOR_LEVEL, PROCESSOR_REVISION, ProgramData, ProgramFiles, ProgramFiles(x86), ProgramW6432, PROMPT, PSModulePath, PUBLIC, REDIS_URL, SAMBANOVA_API_KEY, SESSIONNAME, STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, SystemDrive, SystemRoot, TEMP, TMP, USERDOMAIN, USERDOMAIN_ROAMINGPROFILE, USERNAME, USERPROFILE, windir, WORKER_PORT, WSLENV, WT_PROFILE_ID, WT_SESSION

## Recovery & Reconciliation Actions
1.  **Quarantine Lockdown Asserted**: The node was successfully isolated to prevent state drift.
2.  **Evidence Captured**: Forensic bundle incident-incident-9fa8319b.json was emitted to .ztan/archaeology.
3.  **Audit Sign-off Pending**: Operator must execute recovery ceremony to reset baseline.

## Verdict Tier
*   **FAIL**: Invariant violation triggered node quarantine.
