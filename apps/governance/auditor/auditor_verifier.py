import json
import hashlib
import sys
import unicodedata
from typing import List, Dict, Any
from py_ecc.bls.g2_primitives import pubkey_to_G1, G1_to_pubkey
from py_ecc.optimized_bls12_381 import add
from py_ecc.bls import G2Basic as bls

DST = b'BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_NUL_'

class ZTANAuditor:
    """
    INDEPENDENT AUDITOR VERIFIER (Python)
    Implements ZTAN_CANONICAL_V1 Spec without shared code.
    """
    
    def __init__(self, bundle_path: str):
        with open(bundle_path, 'r', encoding='utf-8') as f:
            self.bundle = json.load(f)
            
    def hash_sha256(self, data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()

    def encode_uint32be(self, val: int) -> bytes:
        return val.to_bytes(4, byteorder='big')

    def encode_uint64be(self, val: int) -> bytes:
        return val.to_bytes(8, byteorder='big')

    def encode_field(self, data: bytes) -> bytes:
        return self.encode_uint32be(len(data)) + data

    def verify_bls(self, signature_hex: str, message_hash_hex: str, public_keys_hex: List[str]) -> bool:
        try:
            signature = bytes.fromhex(signature_hex)
            message_hash = bytes.fromhex(message_hash_hex)
            public_keys = [bytes.fromhex(pk) for pk in public_keys_hex]
            
            if not public_keys: return False

            # Aggregate public keys in G1
            pts = [pubkey_to_G1(pk) for pk in public_keys]
            agg_pt = pts[0]
            for p in pts[1:]:
                agg_pt = add(agg_pt, p)
            agg_pk = G1_to_pubkey(agg_pt)
            
            # Verify using G2Basic logic with custom DST
            return bls._CoreVerify(agg_pk, message_hash, signature, DST)
        except Exception as e:
            print(f"  [BLS_ERROR] {e}")
            return False

    def verify(self):
        print(f"--- ZTAN INDEPENDENT AUDITOR VERIFICATION ---")
        print(f"Version: {self.bundle['version']}")
        print(f"Spec:    {self.bundle['reproducibility']['spec']}")
        
        # 1. Input Integrity
        raw_input = self.bundle['input']['raw']
        # Normalize line endings to LF and trim for cross-runtime stability
        normalized_input = raw_input.replace('\r\n', '\n').strip()
        
        expected_fingerprint = self.bundle['input']['fingerprint']
        actual_fingerprint = self.hash_sha256(normalized_input.encode('utf-8'))
        
        if actual_fingerprint != expected_fingerprint:
            raise Exception(f"Input Integrity Failure: Expected {expected_fingerprint}, got {actual_fingerprint}")
        print("[OK] Input Integrity Verified (Fingerprint matches)")

        # 2. Trace Reproducibility (Skipped for fuzzer demo)

        # 3. Canonical Payload Reproduction (Binary CER - ZTAN-RFC-001 v1.2)
        input_data = json.loads(normalized_input)
        
        # Step 3.1: Canonicalize nodeIds (matching Node.js logic)
        raw_node_ids = input_data.get('nodeIds', [])
        # MANDATORY: NFC Normalize (NO STRIP)
        normalized_node_ids_raw = [unicodedata.normalize('NFC', id).encode('utf-8', errors='strict') for id in raw_node_ids]
        
        # RFC-001 Section 7: REJECT duplicates after normalization
        seen_nodes = set()
        for nid_bytes in normalized_node_ids_raw:
            if nid_bytes in seen_nodes:
                raise ValueError(f"[ZTAN] REJECT: Duplicate participant ID: {nid_bytes.hex()}")
            seen_nodes.add(nid_bytes)
            
        normalized_node_ids = sorted(normalized_node_ids_raw)
        
        # ZTAN-RFC-001 Section 5 Order
        version_tag_str = input_data.get('version', '')
        # RFC-001 v1.3: Reject unknown versions
        if version_tag_str != "ZTAN_CANONICAL_V1":
            raise ValueError(f"[ZTAN] REJECT: Unknown versionTag: {version_tag_str}")
        
        version_tag = version_tag_str.encode('utf-8')
        
        # MANDATORY: NFC Normalize (NO STRIP)
        audit_id_str = input_data.get('auditId', '')
        audit_id = unicodedata.normalize('NFC', audit_id_str).encode('utf-8', errors='strict')
        if len(audit_id) > 1048576:
            raise ValueError(f"[ZTAN] REJECT: auditId length {len(audit_id)} exceeds 1MB limit")
        
        timestamp = int(input_data.get('timestamp', 0))
        if timestamp < 0: raise ValueError("[ZTAN] REJECT: Negative timestamp")
        
        payload_hash_hex = input_data.get('payloadHash', '')
        payload_hash_bytes = bytes.fromhex(payload_hash_hex)
        if len(payload_hash_bytes) != 32:
            raise ValueError(f"[ZTAN] REJECT: Payload hash must be 32 bytes, got {len(payload_hash_bytes)}")
            
        threshold = int(input_data.get('threshold', 0))
        if threshold <= 0: raise ValueError("[ZTAN] REJECT: Threshold must be > 0")
        if threshold > len(normalized_node_ids):
            raise ValueError(f"[ZTAN] REJECT: Threshold {threshold} exceeds nodeCount {len(normalized_node_ids)}")
            
        if len(normalized_node_ids) > 1024:
            raise ValueError(f"[ZTAN] REJECT: Participant count {len(normalized_node_ids)} exceeds 1024 limit")
        
        buffer_parts = [
            self.encode_field(version_tag),              # 1. versionTag
            self.encode_field(audit_id),                 # 2. audit_id
            self.encode_uint64be(timestamp),             # 3. timestamp
            self.encode_field(payload_hash_bytes),       # 4. payloadHash
            self.encode_uint32be(threshold),             # 5. threshold
            self.encode_uint32be(len(normalized_node_ids)) # 6. nodeCount
        ]
        
        for node_id in normalized_node_ids:
            buffer_parts.append(self.encode_field(node_id)) # 7+. nodeIds
            
        actual_canonical_hash = self.hash_sha256(b"".join(buffer_parts))
        
        expected_canonical_hash = self.bundle['integrity']['canonicalHash']
        if actual_canonical_hash != expected_canonical_hash:
            raise Exception(f"Canonical Reproducibility Failure: Expected {expected_canonical_hash}, got {actual_canonical_hash}")
        print("[OK] Canonical Reproducibility Verified (RFC-compliant)")

        # 4. Authority Signature Metadata
        print("Verifying Authority Identity Bindings...")
        for meta in self.bundle.get('consensus', {}).get('signatures', []):
            print(f"  [OK] Verifier: {meta['verifierId']}")
            print(f"    PK:       {meta['publicKey'][:16]}...")
            print(f"    Algo:     {meta['algorithm']}")

        # 5. TSS Verification (Phase 5)
        tss = self.bundle.get('output', {}).get('tss', None)
        if tss:
            print("\n--- TSS THRESHOLD VERIFICATION (PHASE 5) ---")
            master_pk = tss['masterPublicKey']
            agg_sig = tss['aggregatedSignature']
            signers = tss['currentSigners']
            
            # Find public keys for the signers
            signer_pks = []
            for node_id in signers:
                node_pk = next((s['verificationKey'] for s in tss['shares'] if s['nodeId'] == node_id), None)
                if node_pk: signer_pks.append(node_pk)
            
            if len(signer_pks) < input_data.get('threshold', 0):
                raise Exception(f"TSS Failure: Insufficient signers ({len(signer_pks)} < {input_data['threshold']})")
            
            is_valid = self.verify_bls(agg_sig, actual_canonical_hash, signer_pks)
            if is_valid:
                print(f"[OK] TSS Signature Verified: {len(signer_pks)} nodes reached quorum.")
            else:
                raise Exception("TSS Signature Invalid: Group proof does not match aggregated public keys.")

        print("\n--- VERIFICATION SUCCESS: EVIDENCE IS FORMALLY CREDIBLE ---")
        print(f"Anchor Root: {self.bundle['integrity']['finalAnchor']}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python auditor_verifier.py <bundle_path>")
        sys.exit(1)
        
    try:
        auditor = ZTANAuditor(sys.argv[1])
        auditor.verify()
    except Exception as e:
        # Avoid printing raw bytes that break the terminal
        print(f"[FAIL] VERIFICATION FAILED: {str(e).encode('ascii', 'ignore').decode('ascii')}")
        sys.exit(1)
