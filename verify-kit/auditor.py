import hashlib
import json
import sys
from py_ecc.bls.ciphersuites import G2Basic

# ZTAN-RFC-001 v1.5 Portable Auditor
# Dependencies: pip install py_ecc

class ZTANCiphersuite(G2Basic):
    DST = b'BLS_SIG_ZTAN_AUDIT_V1'

    @classmethod
    def VerifyWithContext(cls, PK, message, signature, ceremony_id, threshold, eligible_pks):
        """
        Verify a signature against the structured ZTAN v1.5 context.
        """
        ctx_bytes = ceremony_id.encode('utf-8') if isinstance(ceremony_id, str) else ceremony_id
        
        # Canonical sorting of public keys
        sorted_keys = sorted(eligible_pks)
        keys_bytes = b"".join([bytes.fromhex(pk) for pk in sorted_keys])
        
        # Binding: SHA256(encodeField(ctx) || threshold || encodeField(keys) || encodeField(msg))
        binding_payload = (
            cls.encode_field(ctx_bytes) + 
            threshold.to_bytes(4, 'big') + 
            cls.encode_field(keys_bytes) + 
            cls.encode_field(message)
        )
        
        final_msg = hashlib.sha256(binding_payload).digest()
        return cls.Verify(PK, final_msg, signature)

    @staticmethod
    def encode_field(data):
        if len(data) > 256:
            raise ValueError(f"Field length {len(data)} exceeds 256B limit")
        return len(data).to_bytes(4, 'big') + data

def verify_bundle(bundle_path):
    try:
        with open(bundle_path, 'r', encoding='utf-8') as f:
            bundle = json.load(f)
            
        print(f"\n==========================================")
        print(f"   ZTAN PROOF VERIFICATION KIT (v1.5)")
        print(f"==========================================\n")
        
        print(f"Ceremony ID:  {bundle['ceremonyId']}")
        print(f"Audit ID:     {bundle['payload']['auditId']}")
        print(f"Timestamp:    {bundle['payload']['timestamp']}")
        print(f"Threshold:    {bundle['configuration']['threshold']}")
        print(f"Signers:      {', '.join(bundle['proof']['signers'])}")
        
        pk = bytes.fromhex(bundle['proof']['masterPublicKey'])
        sig = bytes.fromhex(bundle['proof']['aggregatedSignature'])
        msg = bytes.fromhex(bundle['payload']['payloadHash'])
        ceremony_id = bundle['ceremonyId']
        threshold = bundle['configuration']['threshold']
        eligible_pks = bundle['configuration']['eligiblePublicKeys']
        
        if ZTANCiphersuite.VerifyWithContext(pk, msg, sig, ceremony_id, threshold, eligible_pks):
            print("\n✅ VERIFICATION SUCCESSFUL")
            print("Status: The signature is cryptographically valid and bound to this exact context.")
        else:
            print("\n❌ VERIFICATION FAILED")
            print("Status: Cryptographic mismatch or corrupted proof bundle.")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python auditor.py <proof_bundle.json>")
        sys.exit(1)
    verify_bundle(sys.argv[1])
