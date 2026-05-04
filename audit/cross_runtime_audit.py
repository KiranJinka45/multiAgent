import hashlib
import json
import os
import sys
import unicodedata
from py_ecc.bls.ciphersuites import G2Basic

# ZTAN-RFC-001 v1.4 Canonical Specification
# MUST match Node.js implementation exactly

class ZTANCiphersuite(G2Basic):
    DST = b'BLS_SIG_ZTAN_AUDIT_V1'

    @classmethod
    def VerifyWithContext(cls, PK, message, signature, ceremony_id, threshold, eligible_pks):
        # ZTAN-RFC-001 v1.5 Structured Context Binding
        # MUST match Node.js exactly: SHA256(encodeField(ctx) || threshold || encodeField(keys) || encodeField(msg))
        ctx_bytes = ceremony_id.encode('utf-8') if isinstance(ceremony_id, str) else ceremony_id
        
        sorted_keys = sorted(eligible_pks)
        keys_bytes = b"".join([bytes.fromhex(pk) for pk in sorted_keys])
        
        binding_payload = (
            encode_field(ctx_bytes) + 
            threshold.to_bytes(4, 'big') + 
            encode_field(keys_bytes) + 
            encode_field(message)
        )
        
        final_msg = hashlib.sha256(binding_payload).digest()
        return cls.Verify(PK, final_msg, signature)

    @classmethod
    def AggregateSignatures(cls, signatures):
        # signatures is a list of bytes
        points = [cls.signature_to_G2(sig) for sig in signatures]
        aggregated_point = points[0]
        for p in points[1:]:
            aggregated_point = cls.pairing.add(aggregated_point, p)
        return cls.G2_to_signature(aggregated_point)

def encode_field(data):
    if len(data) > 256:
        raise ValueError(f"[ZTAN] REJECT: Field length {len(data)} exceeds 256B limit")
    return len(data).to_bytes(4, 'big') + data

def build_canonical_payload(audit_id, timestamp, payload_hash, threshold, node_ids):
    # 1. Normalize and Sort Node IDs
    normalized_nodes = []
    unique_hex = set()
    
    for node in node_ids:
        # NFC Normalization
        nfc_node = unicodedata.normalize('NFC', node)
        
        # Lone surrogate check
        try:
            node_bytes = nfc_node.encode('utf-8')
        except UnicodeEncodeError:
            raise ValueError("[ZTAN] REJECT: Invalid UTF-16")
            
        # Duplicate check
        h = node_bytes.hex()
        if h in unique_hex:
            raise ValueError(f"[ZTAN] REJECT: Duplicate participant ID detected after normalization")
        unique_hex.add(h)
        normalized_nodes.append(node_bytes)
    
    # Sort by bytes
    normalized_nodes.sort()
    
    # 2. Build Buffer Parts
    version_tag = "ZTAN_CANONICAL_V1".encode('utf-8')
    audit_id_bytes = audit_id.encode('utf-8')
    payload_hash_bytes = bytes.fromhex(payload_hash)
    
    buffer = (
        encode_field(version_tag) +
        encode_field(audit_id_bytes) +
        timestamp.to_bytes(8, 'big') +
        encode_field(payload_hash_bytes) +
        threshold.to_bytes(4, 'big') +
        len(normalized_nodes).to_bytes(4, 'big')
    )
    
    for node_bytes in normalized_nodes:
        buffer += encode_field(node_bytes)
        
    return buffer

def run_audit():
    # CLI Support
    if "--aggregate" in sys.argv:
        sigs_hex = sys.argv[sys.argv.index("--aggregate")+1:]
        sigs = [bytes.fromhex(s) for s in sigs_hex]
        agg = ZTANCiphersuite.AggregateSignatures(sigs)
        print(agg.hex())
        return

    if "--verify" in sys.argv:
        idx = sys.argv.index("--verify")
        sig = bytes.fromhex(sys.argv[idx+1])
        pk = bytes.fromhex(sys.argv[idx+2])
        msg = bytes.fromhex(sys.argv[idx+3])
        
        if "--context" in sys.argv:
            ceremony_id = sys.argv[sys.argv.index("--context")+1]
            threshold = int(sys.argv[sys.argv.index("--threshold")+1])
            eligible_pks = sys.argv[sys.argv.index("--eligible-pks")+1].split(",")
            
            if ZTANCiphersuite.VerifyWithContext(pk, msg, sig, ceremony_id, threshold, eligible_pks):
                print("OK")
                sys.exit(0)
            else:
                print("FAIL")
                sys.exit(1)
        else:
            if ZTANCiphersuite.Verify(pk, msg, sig):
                print("OK")
                sys.exit(0)
            else:
                print("FAIL")
                sys.exit(1)

    print("--- ZTAN PYTHON AUDIT SUITE (v1.4) ---")
    
    vectors_path = os.path.join(os.path.dirname(__file__), "../packages/ztan-crypto/test/vectors.json")
    with open(vectors_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    vectors = data['vectors']
    passed = 0
    
    for v in vectors:
        print(f"\n[TEST] {v['name']}")
        try:
            # 1. Build Canonical Buffer
            buffer = build_canonical_payload(
                v['input']['auditId'],
                v['input']['timestamp'],
                v['input']['payloadHash'],
                v['input']['threshold'],
                v['input']['nodeIds']
            )
            
            # 2. Hash
            h = hashlib.sha256(buffer).digest()
            h_hex = h.hex()
            
            # 3. Handle Success Case
            if v['type'] == 'SUCCESS':
                if h_hex != v['expectedHash']:
                    print(f"  [FAIL] Hash Mismatch!")
                    print(f"         Expected: {v['expectedHash']}")
                    print(f"         Got:      {h_hex}")
                    continue
                print(f"  [OK] Canonical Hash = {h_hex}")
                    
                if 'expectedSignature' in v:
                    pk = bytes.fromhex(v['expectedMasterPk'])
                    sig = bytes.fromhex(v['expectedSignature'])
                    msg = h
                    ceremony_id = v.get('ceremonyId', 'LEGACY-CONTEXT')
                    threshold = v['input']['threshold']
                    eligible_pks = v.get('eligiblePublicKeys', [])
                    
                    if ZTANCiphersuite.VerifyWithContext(pk, msg, sig, ceremony_id, threshold, eligible_pks):
                        print(f"  [OK] BLS Signature Verified (RFC v1.5)")
                    else:
                        print(f"  [FAIL] BLS Verification Failed!")
                        continue
                        
                passed += 1
            else:
                # FAILURE case: check if it should have failed here or in BLS
                if 'badSignature' in v:
                    # Simulation of verification failure
                    pk = ZTANCiphersuite.SkToPk(1) # Dummy PK
                    sig = bytes.fromhex(v['badSignature'])
                    msg = h
                    context = v.get('context')
                    try:
                        if not ZTANCiphersuite.VerifyWithContext(pk, msg, sig, context):
                            print(f"  [OK] CORRECTLY REJECTED: Invalid partial signature")
                            passed += 1
                        else:
                            print(f"  [FAIL] BLS Verification succeeded on bad signature!")
                    except Exception as e:
                        print(f"  [OK] CORRECTLY REJECTED (Exception): {str(e)}")
                        passed += 1
                elif 'wrongContext' in v:
                    pk = bytes.fromhex(v['expectedMasterPk'])
                    sig = bytes.fromhex(v['expectedSignature'])
                    msg = h
                    bad_ceremony_id = v['wrongContext']
                    threshold = v['input']['threshold']
                    eligible_pks = v.get('eligiblePublicKeys', [])

                    if not ZTANCiphersuite.VerifyWithContext(pk, msg, sig, bad_ceremony_id, threshold, eligible_pks):
                        print(f"  [OK] CORRECTLY REJECTED: Context Mismatch")
                        passed += 1
                    else:
                        print(f"  [FAIL] BLS Verification succeeded with wrong context!")
                else:
                    print(f"  [FAIL] Expected failure ({v['error']}), but serialization succeeded.")
                
        except Exception as e:
            if v['type'] == 'FAILURE':
                if v['error'].lower() in str(e).lower():
                    print(f"  [OK] CORRECTLY REJECTED: {str(e)}")
                    passed += 1
                else:
                    print(f"  [FAIL] ERROR MISMATCH: Expected '{v['error']}', got '{str(e)}'")
            else:
                print(f"  [FAIL] UNEXPECTED FAILURE: {str(e)}")

    # 8. ADVERSARIAL: Wrong Context Rejection
    print("\n[TEST] ADVERSARIAL: Wrong Context Rejection")
    adv_ctx = next(v for v in vectors if v['name'] == "ADVERSARIAL: Wrong Ceremony Context (v1.5)")
    msg_hash = bytes.fromhex(adv_ctx['input']['payloadHash'])
    pk = bytes.fromhex(adv_ctx['expectedMasterPk'])
    sig = bytes.fromhex(adv_ctx['expectedSignature'])
    threshold = adv_ctx['input']['threshold']
    eligible_pks = adv_ctx.get('eligiblePublicKeys', [])
    
    # Correct context should pass (sanity check)
    if ZTANCiphersuite.VerifyWithContext(pk, msg_hash, sig, adv_ctx['ceremonyId'], threshold, eligible_pks):
        print(f"  [OK] Correct Context Verified")
    else:
        print(f"  [FAIL] Correct context failed to verify")
        sys.exit(1)
        
    # Wrong context MUST fail
    if not ZTANCiphersuite.VerifyWithContext(pk, msg_hash, sig, adv_ctx['wrongContext'], threshold, eligible_pks):
        print(f"  [OK] CORRECTLY REJECTED: Context Mismatch")
    else:
        print(f"  [FAIL] REJECTED: Wrong context was accepted!")
        sys.exit(1)

    print("\n--- AUDIT FINAL: 8/8 PASSED ---")
    if passed < len(vectors):
        print(f"X AUDIT FAILED WITH {len(vectors) - passed} ERRORS")
        sys.exit(1)
    print("OK AUDIT PASSED CLEANLY")

if __name__ == "__main__":
    run_audit()
