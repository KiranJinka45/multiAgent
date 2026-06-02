# ────────────────────────────────────────────────────────────────────────────────
# ZTAN EU AI Act Compliance Policy — Unit Tests
# ────────────────────────────────────────────────────────────────────────────────
# Run with: opa test rego/ztan/authz/ -v
# ────────────────────────────────────────────────────────────────────────────────

package ztan.authz.eu_ai_act

import future.keywords.if

# ═══ Helper: Build a valid high-risk input with a given attestedAt ═══
make_high_risk_input(attested_at) := {
    "action": "llm-inference",
    "humanOversight": {
        "confirmed": true,
        "overseerIdentity": "auditor@example.com",
        "attestedAt": attested_at,
        "level": "real-time"
    }
}

# ═══ TEST: Fresh attestation (1 hour ago) should ALLOW ═══
test_fresh_attestation_allows if {
    # 1 hour ago in RFC3339 — we use a fixed known-good timestamp
    # and override time.now_ns to be 1 hour later
    one_hour_ns := 3600000000000
    mock_now := time.parse_rfc3339_ns("2026-05-29T12:00:00Z")
    attested_at := "2026-05-29T11:00:00Z"

    allow with input as make_high_risk_input(attested_at) with time.now_ns as mock_now
}

# ═══ TEST: Attestation exactly at 24h boundary should ALLOW ═══
test_attestation_at_24h_boundary_allows if {
    mock_now := time.parse_rfc3339_ns("2026-05-30T12:00:00Z")
    attested_at := "2026-05-29T12:00:00Z"

    allow with input as make_high_risk_input(attested_at) with time.now_ns as mock_now
}

# ═══ TEST: Stale attestation (48 hours ago) should DENY ═══
test_stale_attestation_denies if {
    mock_now := time.parse_rfc3339_ns("2026-05-31T12:00:00Z")
    attested_at := "2026-05-29T12:00:00Z"

    not allow with input as make_high_risk_input(attested_at) with time.now_ns as mock_now
}

# ═══ TEST: Attestation from 5 years ago should DENY ═══
test_ancient_attestation_denies if {
    mock_now := time.parse_rfc3339_ns("2026-05-29T12:00:00Z")
    attested_at := "2021-01-01T00:00:00Z"

    not allow with input as make_high_risk_input(attested_at) with time.now_ns as mock_now
}

# ═══ TEST: Empty attestedAt string should DENY ═══
# time.parse_rfc3339_ns("") will fail, causing the rule to not match → deny
test_empty_attestation_denies if {
    not allow with input as make_high_risk_input("")
}

# ═══ TEST: Invalid RFC3339 format should DENY ═══
test_invalid_format_denies if {
    not allow with input as make_high_risk_input("not-a-date")
}

# ═══ TEST: Non-high-risk action bypasses attestation entirely ═══
test_non_high_risk_action_allows if {
    allow with input as {
        "action": "log-append",
        "humanOversight": {
            "confirmed": false,
            "overseerIdentity": "",
            "attestedAt": "",
            "level": ""
        }
    }
}

# ═══ TEST: High-risk without oversight confirmation should DENY ═══
test_high_risk_no_oversight_denies if {
    not allow with input as {
        "action": "llm-inference",
        "humanOversight": {
            "confirmed": false,
            "overseerIdentity": "someone",
            "attestedAt": "2026-05-29T12:00:00Z",
            "level": "real-time"
        }
    }
}

# ═══ TEST: High-risk with oversight but missing overseerIdentity should DENY ═══
test_missing_overseer_denies if {
    mock_now := time.parse_rfc3339_ns("2026-05-29T12:00:00Z")

    not allow with input as {
        "action": "autonomous-decision",
        "humanOversight": {
            "confirmed": true,
            "overseerIdentity": "",
            "attestedAt": "2026-05-29T11:00:00Z",
            "level": "pre-approval"
        }
    } with time.now_ns as mock_now
}

# ═══ TEST: High-risk with invalid oversight level should DENY ═══
test_invalid_level_denies if {
    mock_now := time.parse_rfc3339_ns("2026-05-29T12:00:00Z")

    not allow with input as {
        "action": "credit-scoring",
        "humanOversight": {
            "confirmed": true,
            "overseerIdentity": "reviewer@example.com",
            "attestedAt": "2026-05-29T11:00:00Z",
            "level": "rubber-stamp"
        }
    } with time.now_ns as mock_now
}

# ═══ TEST: Denial reasons include freshness message for stale attestation ═══
test_stale_attestation_produces_reason if {
    mock_now := time.parse_rfc3339_ns("2026-05-31T12:00:00Z")
    attested_at := "2026-05-29T12:00:00Z"

    r := reasons with input as make_high_risk_input(attested_at) with time.now_ns as mock_now
    count(r) > 0
}
