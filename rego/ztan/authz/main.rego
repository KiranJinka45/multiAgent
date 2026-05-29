# ────────────────────────────────────────────────────────────────────────────────
# ZTAN Core Authorization Policy — main.rego
# ────────────────────────────────────────────────────────────────────────────────
# Enforces:
#   1. Valid tenant identity
#   2. Permitted action against the operation allowlist
#   3. Quota remaining (hourly execution budget)
#   4. Operator authorization
#   5. Payload structural bounds
#
# Default posture: DENY. Every rule must be satisfied for allow = true.
# ────────────────────────────────────────────────────────────────────────────────

package ztan.authz

import future.keywords.if
import future.keywords.in

# ═══ DEFAULT DENY ═══
default allow := false

# ═══ COMPOSITE ALLOW RULE ═══
allow if {
    tenant_valid
    action_permitted
    quota_remaining
    operator_authorized
    payload_within_bounds
}

# ─── 1. Tenant Validation ───────────────────────────────────────────────────
# Tenant ID must be a non-empty string and must not be on the deny list.
tenant_valid if {
    input.tenantId != ""
    not denied_tenants[input.tenantId]
}

denied_tenants := {
    "REVOKED_TENANT",
    "SUSPENDED_TENANT",
}

# ─── 2. Action Allowlist ────────────────────────────────────────────────────
# Only explicitly permitted operations are allowed.
action_permitted if {
    permitted_actions[input.action]
}

permitted_actions := {
    "vm-execute",
    "file-read",
    "file-write",
    "network-fetch",
    "llm-inference",
    "build-trigger",
    "mission-create",
    "mission-update",
    "log-append",
}

# ─── 3. Quota Check ─────────────────────────────────────────────────────────
# The caller must provide current usage count and tier limit.
# This policy enforces the server-side check — Redis counters provide the data.
quota_remaining if {
    input.quota.currentCount < input.quota.limit
}

# Fallback: If quota data is not provided, deny (fail-closed).
# This prevents bypass by omitting quota fields.
default quota_remaining := false

# ─── 4. Operator Authorization ──────────────────────────────────────────────
operator_authorized if {
    input.operator != ""
    input.operator != "compromised_operator"
    authorized_operators[input.operator]
}

authorized_operators := {
    "steward_omega",
    "operator_alpha",
    "operator_beta",
    "backup_steward",
    "system",
}

# ─── 5. Payload Structural Bounds ────────────────────────────────────────────
# Payload must be non-empty and under 1MB to prevent resource exhaustion.
payload_within_bounds if {
    input.payload != ""
    count(input.payload) <= 1048576
}

# ═══ DENIAL REASONS ═══
# Returns structured reasons for debugging (never in production responses).
reasons[msg] if {
    not tenant_valid
    msg := "TENANT_INVALID: tenantId is empty, missing, or revoked"
}

reasons[msg] if {
    not action_permitted
    msg := sprintf("ACTION_DENIED: '%s' is not in the permitted actions allowlist", [input.action])
}

reasons[msg] if {
    not quota_remaining
    msg := "QUOTA_EXCEEDED: execution count has reached or exceeded the hourly tier limit"
}

reasons[msg] if {
    not operator_authorized
    msg := "OPERATOR_UNAUTHORIZED: operator identity is invalid or not in the authorized roster"
}

reasons[msg] if {
    not payload_within_bounds
    msg := "PAYLOAD_BOUNDS: payload is empty or exceeds the 1MB structural limit"
}
