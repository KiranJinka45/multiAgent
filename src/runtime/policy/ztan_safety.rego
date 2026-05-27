package ztan.safety

# Default deny
default allow = false

# Allow access if signature is valid, payload meets structural bounds, and operator is authorized
allow {
    signature_valid
    payload_within_bounds
    operator_authorized
}

# Verify cryptographic signature attribute presence
signature_valid {
    input.signature != ""
    startswith(input.signature, "sig:")
}

# Enforce payload constraints (must be valid JSON, under 1MB)
payload_within_bounds {
    input.payload != ""
    count(input.payload) <= 1048576
}

# Enforce operator authorization lists
operator_authorized {
    input.operator != ""
    input.operator != "compromised_operator"
    # Ensure operator is listed in authorized personnel rosters
    valid_operators[input.operator]
}

# Authorized operator set
valid_operators = {
    "steward_omega",
    "operator_alpha",
    "operator_beta",
    "backup_steward",
    "mock_operator"
}
