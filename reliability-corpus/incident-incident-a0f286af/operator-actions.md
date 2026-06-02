# Incident INCIDENT-A0F286AF - Forensic Replay Analysis

## Incident Parameters
*   **Incident ID**: INCIDENT-A0F286AF
*   **Timestamp**: 2026-05-30T05:45:36.482Z
*   **Failure Class**: STARTUP_ATTESTATION_ENV_DRIFT
*   **Confidence**: 0.5

## Observed Pathology
*   Initiating ZTAN node boot and startup attestation checks.
*   HARD QUARANTINE: Simulated infrastructure attestation failure during drill
*   FATAL: Core runtime invariants failed attestation. Quarantine lockdown activated.

## Captured Environment
*   **Hashed Environment Keys**: ALLUSERSPROFILE, ANTIGRAVITY_AGENT, ANTIGRAVITY_CSRF_TOKEN, ANTIGRAVITY_EDITOR_APP_ROOT, ANTIGRAVITY_LS_ADDRESS, ANTIGRAVITY_SOURCE_METADATA, ANTIGRAVITY_TRAJECTORY_ID, APPDATA, AUTH_PORT, AUTH_SERVICE_URL, CHROME_CRASHPAD_PIPE_NAME, COLOR, CommonProgramFiles, CommonProgramFiles(x86), CommonProgramW6432, COMPUTERNAME, ComSpec, CORE_API_URL, DATABASE_URL, DriverData, EDITOR, EFC_11228_1262719628, EFC_11228_1592913036, EFC_11228_2283032206, EFC_11228_2775293581, EFC_11228_3789132940, EFC_11228_4126798990, GATEWAY_PORT, HOME, HOMEDRIVE, HOMEPATH, INIT_CWD, JAVA_HOME, JWT_SECRET, LOCALAPPDATA, LOGONSERVER, NODE, NODE_ENV, NODE_EXE, npm_command, npm_config_cache, npm_config_confirmmodulespurge, npm_config_globalconfig, npm_config_global_prefix, npm_config_init_module, npm_config_local_prefix, npm_config_node_gyp, npm_config_node_linker, npm_config_noproxy, npm_config_npm_version, npm_config_prefix, npm_config_scripts_prepend_node_path, npm_config_shamefully_hoist, npm_config_userconfig, npm_config_user_agent, npm_execpath, npm_lifecycle_event, npm_lifecycle_script, npm_node_execpath, npm_package_engines_node, npm_package_engines_pnpm, npm_package_json, npm_package_name, npm_package_version, NPM_PREFIX_JS, NPM_PREFIX_NPX_CLI_JS, NPX_CLI_JS, NUMBER_OF_PROCESSORS, OneDrive, OneDriveConsumer, OS, OTEL_EXPORTER_OTLP_ENDPOINT, PARTNER_ALPHA_KEY, PATH, PATHEXT, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, PROCESSOR_ARCHITECTURE, PROCESSOR_IDENTIFIER, PROCESSOR_LEVEL, PROCESSOR_REVISION, ProgramData, ProgramFiles, ProgramFiles(x86), ProgramW6432, PROMPT, PSModulePath, PUBLIC, REDIS_URL, SESSIONNAME, SystemDrive, SystemRoot, TEMP, TMP, USERDOMAIN, USERDOMAIN_ROAMINGPROFILE, USERNAME, USERPROFILE, VSCODE_CODE_CACHE_PATH, VSCODE_CWD, VSCODE_IPC_HOOK, VSCODE_NLS_CONFIG, VSCODE_PID, windir

## Recovery & Reconciliation Actions
1.  **Quarantine Lockdown Asserted**: The node was successfully isolated to prevent state drift.
2.  **Evidence Captured**: Forensic bundle incident-incident-a0f286af.json was emitted to .ztan/archaeology.
3.  **Audit Sign-off Pending**: Operator must execute recovery ceremony to reset baseline.

## Verdict Tier
*   **FAIL**: Invariant violation triggered node quarantine.
