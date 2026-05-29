# Incident INCIDENT-F6F574CE - Forensic Replay Analysis

## Incident Parameters
*   **Incident ID**: INCIDENT-F6F574CE
*   **Timestamp**: 2026-05-25T06:34:33.511Z
*   **Failure Class**: STARTUP_ATTESTATION_ENV_DRIFT
*   **Confidence**: 0.95

## Observed Pathology
*   Initiating ZTAN node boot and startup attestation checks.
*   [ENV_AUDIT_ERROR] Shadow override variable detected: "unauthorized_proxy_override".
*   [OPA_REST_GATE_DENIAL] fail-closed OPA denial on write. Target role mismatch: operator "rogue_operator" is not allowed.
*   [STORAGE_MERKLE_CHAIN_ERROR] Lineage integrity break on Ledger block #22. Expected prevHash mismatch.
*   FATAL: Core runtime invariants failed attestation. Quarantine lockdown activated.

## Captured Environment
*   **Hashed Environment Keys**: AICC_API_KEY, ALLUSERSPROFILE, ANTIGRAVITY_CLI_ALIAS, APPDATA, AUTH_SERVICE_PORT, BUNDLED_DEBUGPY_PATH, CEREBRAS_API_KEY, CERTIFICATION_MODE, CHROME_CRASHPAD_PIPE_NAME, CLUSTER_WORKERS, COLOR, COLORTERM, CommonProgramFiles, CommonProgramFiles(x86), CommonProgramW6432, COMPUTERNAME, ComSpec, CORE_API_PORT, CORE_ENGINE_PORT, CORE_ENGINE_URL, DATABASE_URL, DEFAULT_EMBEDDING_MODEL, DriverData, EDITOR, EFC_10684_1592913036, EFC_10684_4126798990, FRONTEND_PORT, GATEWAY_PORT, GEMINI_API_KEY, GIT_ASKPASS, GROQ_API_KEY, HOME, HOMEDRIVE, HOMEPATH, INIT_CWD, INTERNAL_SERVICE_TOKEN, JAVA_HOME, JWT_SECRET, JWT_SECRET_KEY, LANG, LLM_PROVIDER, LOCALAPPDATA, LOGONSERVER, MISTRAL_API_KEY, MOCK_DB, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, NODE, NODE_ENV, NODE_EXE, NO_CLUSTER, npm_command, npm_config_cache, npm_config_confirmmodulespurge, npm_config_globalconfig, npm_config_global_prefix, npm_config_init_module, npm_config_local_prefix, npm_config_node_gyp, npm_config_node_linker, npm_config_noproxy, npm_config_npm_version, npm_config_prefix, npm_config_scripts_prepend_node_path, npm_config_shamefully_hoist, npm_config_userconfig, npm_config_user_agent, npm_execpath, npm_lifecycle_event, npm_lifecycle_script, npm_node_execpath, npm_package_engines_node, npm_package_engines_pnpm, npm_package_json, npm_package_name, npm_package_version, NPM_PREFIX_JS, NPM_PREFIX_NPX_CLI_JS, NPX_CLI_JS, NUMBER_OF_PROCESSORS, OneDrive, OneDriveConsumer, OPENAI_API_KEY, OS, path, PATHEXT, PROCESSOR_ARCHITECTURE, PROCESSOR_IDENTIFIER, PROCESSOR_LEVEL, PROCESSOR_REVISION, ProgramData, ProgramFiles, ProgramFiles(x86), ProgramW6432, PROMPT, PSModulePath, PUBLIC, PYDEVD_DISABLE_FILE_VALIDATION, PYTHONSTARTUP, PYTHON_BASIC_REPL, REDIS_URL, SAMBANOVA_API_KEY, SESSIONNAME, STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, SystemDrive, SystemRoot, TEMP, TERM_PROGRAM, TERM_PROGRAM_VERSION, TMP, USERDOMAIN, USERDOMAIN_ROAMINGPROFILE, USERNAME, USERPROFILE, VSCODE_DEBUGPY_ADAPTER_ENDPOINTS, VSCODE_GIT_ASKPASS_EXTRA_ARGS, VSCODE_GIT_ASKPASS_MAIN, VSCODE_GIT_ASKPASS_NODE, VSCODE_GIT_IPC_HANDLE, VSCODE_INJECTION, VSCODE_PYTHON_AUTOACTIVATE_GUARD, windir, WORKER_PORT

## Recovery & Reconciliation Actions
1.  **Quarantine Lockdown Asserted**: The node was successfully isolated to prevent state drift.
2.  **Evidence Captured**: Forensic bundle incident-incident-f6f574ce.json was emitted to .ztan/archaeology.
3.  **Audit Sign-off Pending**: Operator must execute recovery ceremony to reset baseline.

## Verdict Tier
*   **FAIL**: Invariant violation triggered node quarantine.
