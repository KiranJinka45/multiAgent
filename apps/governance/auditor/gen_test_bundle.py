import json
import hashlib
import binascii

# ZTAN RFC-001 v1.4 Test Bundle Generation
input_data = {
    "version": "ZTAN_CANONICAL_V1",
    "auditId": "RFC-COMPLEX-🎉-V1.4",
    "timestamp": 1710000000000,
    "nodeIds": ["Node-C", "Node-A", "Node-B"],
    "threshold": 2,
    "payloadHash": "7289f43e1d3e4b5a6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b"
}

# The canonical hash from previous Node.js run for this exact input
canonical_hash = "6548a80d50df52485303eb2f59239e944747c38520268579d49f059e09d17fba"

bundle = {
    "version": "1.7.0",
    "input": {
        "raw": json.dumps(input_data, ensure_ascii=False),
        "fingerprint": hashlib.sha256(json.dumps(input_data, ensure_ascii=False).encode('utf-8')).hexdigest()
    },
    "reproducibility": {
        "spec": "ZTAN-RFC-001 v1.4"
    },
    "integrity": {
        "canonicalHash": canonical_hash,
        "finalAnchor": "s3://ztan-audit-vault/RFC-COMPLEX-V1.4.json"
    },
    "output": {
        "hash": canonical_hash,
        "tss": {
            "masterPublicKey": "f91295245cc8e1da", # Dummy for now, we'll see if verify_bls handles it
            "aggregatedSignature": "b28509040846152a", # Dummy
            "currentSigners": ["Node-A", "Node-B"],
            "shares": [
                {"nodeId": "Node-A", "verificationKey": "00" * 48},
                {"nodeId": "Node-B", "verificationKey": "11" * 48},
                {"nodeId": "Node-C", "verificationKey": "22" * 48}
            ]
        }
    },
    "consensus": {
        "signatures": []
    }
}

with open("test_bundle.json", "w", encoding="utf-8") as f:
    json.dump(bundle, f, ensure_ascii=False, indent=2)

print("Generated test_bundle.json")
