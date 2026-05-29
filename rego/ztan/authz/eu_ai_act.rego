# ────────────────────────────────────────────────────────────────────────────────
# ZTAN EU AI Act Compliance Policy — eu_ai_act.rego
# ────────────────────────────────────────────────────────────────────────────────
# Enforces Article 14 (Human Oversight) requirements for high-risk AI operations.
#
# Key invariant:
#   High-risk AI operations MUST NOT proceed without explicit human oversight
#   confirmation. This policy blocks any operation classified as high-risk
#   unless the caller provides documented human oversight attestation.
#
# Default posture: DENY for high-risk operations without oversight.
# ────────────────────────────────────────────────────────────────────────────────

package ztan.authz.eu_ai_act

import future.keywords.if
import future.keywords.in

# ═══ DEFAULT DENY ═══
default allow := false

# ═══ ALLOW: Non-high-risk operations pass through ═══
allow if {
    not is_high_risk_operation
}

# ═══ ALLOW: High-risk operations WITH human oversight attestation ═══
allow if {
    is_high_risk_operation
    human_oversight_confirmed
    oversight_attestation_valid
}

# ─── High-Risk Operation Classification ─────────────────────────────────────
# Operations that fall under EU AI Act Annex III high-risk categories.
is_high_risk_operation if {
    high_risk_actions[input.action]
}

high_risk_actions := {
    "llm-inference",           # AI-generated content / decision support
    "autonomous-decision",     # Automated decision-making
    "biometric-processing",    # Biometric identification
    "critical-infrastructure", # Safety-critical infrastructure control
    "employment-decision",     # HR/employment automated screening
    "credit-scoring",          # Automated creditworthiness assessment
    "law-enforcement",         # Predictive policing or judicial AI
}

# ─── Human Oversight Attestation (Article 14) ───────────────────────────────
# The caller must explicitly confirm human oversight is active.
human_oversight_confirmed if {
    input.humanOversight.confirmed == true
}

# The oversight attestation must include required fields.
oversight_attestation_valid if {
    # Who is providing oversight
    input.humanOversight.overseerIdentity != ""

    # When was oversight established (must be within last 24 hours)
    input.humanOversight.attestedAt != ""

    # What level of oversight is being applied
    valid_oversight_levels[input.humanOversight.level]
}

valid_oversight_levels := {
    "real-time",         # Human monitoring in real-time
    "pre-approval",      # Human pre-approved the operation
    "post-review",       # Human will review outputs before action
    "supervisory",       # Human has override capability
}

# ═══ DENIAL REASONS ═══
reasons[msg] if {
    is_high_risk_operation
    not human_oversight_confirmed
    msg := sprintf(
        "EU_AI_ACT_ARTICLE_14: Action '%s' classified as high-risk AI operation. " +
        "Human oversight confirmation is REQUIRED but was not provided. " +
        "Set humanOversight.confirmed=true with valid attestation.",
        [input.action]
    )
}

reasons[msg] if {
    is_high_risk_operation
    human_oversight_confirmed
    not oversight_attestation_valid
    msg := sprintf(
        "EU_AI_ACT_ARTICLE_14: Action '%s' has human oversight flag but attestation is incomplete. " +
        "Required: overseerIdentity, attestedAt, and level (one of: real-time, pre-approval, post-review, supervisory).",
        [input.action]
    )
}

# ═══ AUDIT TRAIL ═══
# Returns structured audit data for compliance logging.
audit_record := {
    "action": input.action,
    "is_high_risk": is_high_risk_operation,
    "oversight_confirmed": human_oversight_confirmed,
    "attestation_valid": oversight_attestation_valid,
    "decision": allow,
    "policy_version": "1.0.0",
    "regulation": "EU AI Act 2024, Article 14",
}
