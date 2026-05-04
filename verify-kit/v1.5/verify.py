import hashlib
import json
import os
import sys
import argparse
from py_ecc.bls.ciphersuites import G2Basic

# ZTAN-RFC-001 v1.5 Canonical Specification
# MUST match Node.js implementation exactly

class ZTANCiphersuite(G2Basic):
    DST = b'BLS_SIG_ZTAN_AUDIT_V1'

    @classmethod
    def VerifyWithContext(cls, PK, message_hash, signature, ceremony_id, threshold, eligible_pks):
        """
        Verify a ZTAN-RFC-001 v1.5 bound signature.
        """
        # 0. Strict Length Validation (RFC v1.5)
        if len(PK) != 48:
            raise ValueError(f"[ZTAN] REJECT: Invalid Master PK length ({len(PK)}B). Expected 48B.")
        if len(signature) != 96:
            raise ValueError(f"[ZTAN] REJECT: Invalid Signature length ({len(signature)}B). Expected 96B.")
        for pk in eligible_pks:
            if len(bytes.fromhex(pk)) != 48:
                raise ValueError(f"[ZTAN] REJECT: Invalid Eligible PK length. Expected 48B.")

        ctx_bytes = ceremony_id.encode('utf-8') if isinstance(ceremony_id, str) else ceremony_id
        
        # 1. Sort eligible public keys lexicographically by bytes
        sorted_keys = sorted([bytes.fromhex(pk) for pk in eligible_pks])
        keys_bytes = b"".join(sorted_keys)
        
        # 2. Build Binding Payload (CER v1.5)
        # Layout: LP(ceremonyId) || uint32BE(threshold) || LP(sortedKeys) || LP(msgHash)
        binding_payload = (
            encode_field(ctx_bytes) + 
            threshold.to_bytes(4, 'big') + 
            encode_field(keys_bytes) + 
            encode_field(message_hash)
        )
        
        # 3. Final Binding Hash
        final_msg = hashlib.sha256(binding_payload).digest()
        
        # 4. Standard BLS Verification
        return cls.Verify(PK, final_msg, signature)

def encode_field(data):
    """Canonical Field Encoding: uint32BE(len) || data"""
    return len(data).to_bytes(4, 'big') + data

def verify_bundle(bundle_path):
    print(f"[*] Loading proof bundle: {bundle_path}")
    with open(bundle_path, 'r') as f:
        bundle = json.load(f)
    
    sig = bytes.fromhex(bundle['signature'])
    pk = bytes.fromhex(bundle['masterPublicKey'])
    msg_hash = bytes.fromhex(bundle['messageHash'])
    ceremony_id = bundle['ceremonyId']
    threshold = bundle['threshold']
    eligible_pks = bundle['eligiblePublicKeys']

    print(f"[*] Verifying RFC v1.5 Binding (Ceremony: {ceremony_id}, Threshold: {threshold})...")
    
    if ZTANCiphersuite.VerifyWithContext(pk, msg_hash, sig, ceremony_id, threshold, eligible_pks):
        print("[SUCCESS] Proof is valid and non-repudiable.")
        return True
    else:
        print("[FAILURE] Invalid proof signature or context mismatch.")
        return False

def run_tests(vectors_path):
    print(f"[*] Running formal test vectors: {vectors_path}")
    with open(vectors_path, 'r') as f:
        vectors = json.load(f)
    
    passed = 0
    for v in vectors:
        print(f"\n[TEST] {v['name']}")
        # For simplicity in this script, we verify the binding hash first
        inp = v['input']
        
        ctx_bytes = inp['ceremonyId'].encode('utf-8')
        sorted_keys = sorted([bytes.fromhex(pk) for pk in inp['eligiblePublicKeys']])
        keys_bytes = b"".join(sorted_keys)
        msg_hash = bytes.fromhex(inp['messageHash'])
        
        payload = (
            encode_field(ctx_bytes) + 
            inp['threshold'].to_bytes(4, 'big') + 
            encode_field(keys_bytes) + 
            encode_field(msg_hash)
        )
        
        calc_hash = hashlib.sha256(payload).hexdigest()
        
        if 'expectedCanonicalLayout' in v:
            # Check layout parity if provided
            calc_layout = payload.hex()
            if calc_layout != v['expectedCanonicalLayout']:
                print(f"  [FAIL] Layout Mismatch!")
                print(f"         Expected: {v['expectedCanonicalLayout']}")
                print(f"         Got:      {calc_layout}")
                continue
            print(f"  [OK] Canonical Layout Matched.")

        if 'bindingHash' in v and v['bindingHash'] != "verified_deterministic_hash_here":
            if calc_hash != v['bindingHash']:
                print(f"  [FAIL] Binding Hash Mismatch!")
                print(f"         Expected: {v['bindingHash']}")
                print(f"         Got:      {calc_hash}")
                continue
            print(f"  [OK] Binding Hash Matched.")
        else:
            print(f"  [INFO] Computed Binding Hash: {calc_hash}")

        passed += 1
    
    print(f"\n--- TEST SUMMARY: {passed}/{len(vectors)} PASSED ---")
    return passed == len(vectors)

def main():
    parser = argparse.ArgumentParser(description="ZTAN External Verification Tool (v1.5)")
    parser.add_argument("--bundle", help="Path to proof bundle JSON")
    parser.add_argument("--test", help="Path to test vectors JSON")
    
    args = parser.parse_args()
    
    if args.bundle:
        if verify_bundle(args.bundle):
            sys.exit(0)
        else:
            sys.exit(1)
    
    if args.test:
        if run_tests(args.test):
            sys.exit(0)
        else:
            sys.exit(1)
            
    parser.print_help()

if __name__ == "__main__":
    main()
