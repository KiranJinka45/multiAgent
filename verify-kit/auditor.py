import hashlib
import json
import sys
import base64
from py_ecc.bls.ciphersuites import G2Basic
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization

# ZTAN-RFC-001 Portable Auditor
# Supports: v1.8, v1.9, v1.10, v1.5, and legacy schemas.
# Dependencies: pip install py_ecc cryptography

class ZTANCiphersuite(G2Basic):
    DST = b'BLS_SIG_ZTAN_AUDIT_V1'

    @classmethod
    def VerifyWithContext(cls, PK, message, signature, ceremony_id, threshold, eligible_pks):
        """
        Verify a signature against the structured ZTAN context.
        """
        ctx_bytes = ceremony_id.encode('utf-8') if isinstance(ceremony_id, str) else ceremony_id
        
        # Canonical sorting of public keys BY BYTES (not hex strings)
        sorted_keys = sorted([bytes.fromhex(pk) for pk in eligible_pks])
        keys_bytes = b"".join(sorted_keys)
        
        # Binding: SHA256(encodeField(ctx) || threshold || encodeField(keys) || encodeField(msg))
        binding_payload = (
            cls.encode_field(ctx_bytes) + 
            threshold.to_bytes(4, 'big') + 
            cls.encode_field(keys_bytes) + 
            cls.encode_field(message)
        )
        
        final_msg = hashlib.sha256(binding_payload).digest()
        # Use G2Basic.Verify directly to match @noble/bls12-381 default DST
        return G2Basic.Verify(PK, final_msg, signature)

    @staticmethod
    def encode_field(data):
        if len(data) > 0xFFFFFFFF:
            raise ValueError(f"Field length {len(data)} exceeds uint32 limit")
        return len(data).to_bytes(4, 'big') + data

def verify_ed25519_sig(public_key_pem, payload_dict, signature_base64):
    """
    Verify Ed25519 signature on canonical JSON serialization.
    """
    try:
        pk = serialization.load_pem_public_key(public_key_pem.encode('utf-8'))
        payload_str = json.dumps(payload_dict, separators=(',', ':'))
        payload_bytes = payload_str.encode('utf-8')
        sig_bytes = base64.b64decode(signature_base64)
        pk.verify(sig_bytes, payload_bytes)
        return True
    except Exception as e:
        print(f"  [-] Ed25519 Verification Failure: {str(e)}")
        return False

def verify_bundle(bundle_path):
    try:
        with open(bundle_path, 'r', encoding='utf-8') as f:
            bundle = json.load(f)
            
        version = bundle.get('version', 'legacy')
        print(f"\n==========================================")
        print(f"   ZTAN PROOF VERIFICATION KIT (v1.10)")
        print(f"==========================================\n")
        print(f"File Path:    {bundle_path}")
        print(f"Schema:       {version}")
        
        if version == 'v1.8' or version == 'v1.9':
            # v1.8 / v1.9 Ed25519 Offline Attestations
            pk_pem = bundle.get('publicKeyPem')
            if not pk_pem:
                raise ValueError("publicKeyPem is missing from the bundle")
            
            print(f"Mission ID:   {bundle.get('missionId')}")
            print(f"Epoch:        {bundle.get('governanceEpoch')}")
            
            # 1. Containment Proof
            containment_data = {k: v for k, v in bundle['containmentProof'].items() if k != 'signature'}
            containment_sig = bundle['containmentProof']['signature']
            print("[*] Verifying Containment Proof signature...")
            if not verify_ed25519_sig(pk_pem, containment_data, containment_sig):
                raise ValueError("Containment Proof signature check FAILED")
            print("  [+] Containment Proof Verified.")
            
            # 2. Recovery Assurance
            recovery_data = {k: v for k, v in bundle['recoveryAssurance'].items() if k != 'engineSignature'}
            recovery_sig = bundle['recoveryAssurance']['engineSignature']
            print("[*] Verifying Recovery Assurance signature...")
            if not verify_ed25519_sig(pk_pem, recovery_data, recovery_sig):
                raise ValueError("Recovery Assurance signature check FAILED")
            print("  [+] Recovery Assurance Verified.")
            
            # 3. Sandbox Attestation
            sandbox_data = {k: v for k, v in bundle['sandboxAttestation'].items() if k != 'providerSignature'}
            sandbox_sig = bundle['sandboxAttestation']['providerSignature']
            print("[*] Verifying Sandbox Attestation signature...")
            if not verify_ed25519_sig(pk_pem, sandbox_data, sandbox_sig):
                raise ValueError("Sandbox Attestation signature check FAILED")
            print("  [+] Sandbox Attestation Verified.")
            
            # For v1.9, also check notary registration
            if version == 'v1.9':
                print("[*] Checking Rekor Notarization metadata...")
                audit = bundle.get('_audit', {})
                if not audit.get('notarized') or not audit.get('notarySeq'):
                    raise ValueError("v1.9 Notarization metadata is missing or invalid")
                print(f"  [+] Notary Sequence: {audit['notarySeq']}")
                print(f"  [+] Notary Hash:     {audit['hash']}")
                
            print("\n[SUCCESS] VERIFICATION SUCCESSFUL")
            print("Status: All offline signatures are verified and cryptographically sound.")
            return True
            
        elif version == 'v1.10' or version == 'ZTAN_V1.5':
            # v1.10 / v1.5 BLS12-381 Threshold Attestation
            if version == 'v1.10':
                pk = bytes.fromhex(bundle['masterPublicKey'])
                sig = bytes.fromhex(bundle['_audit']['aggregatedSignature'])
                msg = bytes.fromhex(bundle['messageHash'])
                ceremony_id = bundle['ceremonyId']
                threshold = bundle['threshold']
                eligible_pks = bundle['eligiblePublicKeys']
                signers = bundle.get('signers', [])
                
                print(f"Sequence ID:  {bundle.get('sequenceId')}")
                print(f"Ceremony ID:  {ceremony_id}")
                print(f"Threshold:    {threshold}-of-{len(eligible_pks)}")
                print(f"Signers:      {', '.join(signers)}")
                
                # Verify ZK proof metadata presence
                zk = bundle['_audit'].get('zkProof')
                if zk:
                    print(f"[+] ZK-Proof present. Public Signals: {zk.get('publicSignals')}")
            else:
                # v1.5 flat format
                pk = bytes.fromhex(bundle['masterPublicKey'])
                sig = bytes.fromhex(bundle['signature'])
                msg = bytes.fromhex(bundle['messageHash'])
                ceremony_id = bundle['ceremonyId']
                threshold = bundle['threshold']
                eligible_pks = bundle['eligiblePublicKeys']
                signers = bundle.get('signers', [])
                
                print(f"Ceremony ID:  {ceremony_id}")
                print(f"Threshold:    {threshold}")
                print(f"Signers:      {', '.join(signers)}")
            
            print("[*] Performing BLS12-381 context-bound threshold signature check...")
            if ZTANCiphersuite.VerifyWithContext(pk, msg, sig, ceremony_id, threshold, eligible_pks):
                print("\n[SUCCESS] VERIFICATION SUCCESSFUL")
                print("Status: The signature is cryptographically valid and bound to this exact context.")
                return True
            else:
                print("\n[FAIL] VERIFICATION FAILED")
                print("Status: Cryptographic mismatch or corrupted proof bundle.")
                sys.exit(1)
                
        else:
            # Legacy nested format
            pk = bytes.fromhex(bundle['proof']['masterPublicKey'])
            sig = bytes.fromhex(bundle['proof']['aggregatedSignature'])
            msg = bytes.fromhex(bundle['payload']['payloadHash'])
            ceremony_id = bundle['ceremonyId']
            threshold = bundle['configuration']['threshold']
            eligible_pks = bundle['configuration']['eligiblePublicKeys']
            signers = bundle['proof'].get('signers', [])
            
            print(f"Ceremony ID:  {ceremony_id}")
            print(f"Audit ID:     {bundle['payload']['auditId']}")
            print(f"Timestamp:    {bundle['payload']['timestamp']}")
            print(f"Threshold:    {threshold}")
            print(f"Signers:      {', '.join(signers)}")
            
            print("[*] Performing BLS12-381 legacy threshold signature check...")
            if ZTANCiphersuite.VerifyWithContext(pk, msg, sig, ceremony_id, threshold, eligible_pks):
                print("\n[SUCCESS] VERIFICATION SUCCESSFUL")
                print("Status: The signature is cryptographically valid and bound to this exact context.")
                return True
            else:
                print("\n[FAIL] VERIFICATION FAILED")
                print("Status: Cryptographic mismatch or corrupted proof bundle.")
                sys.exit(1)
            
    except Exception as e:
        print(f"\n[ERROR] {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python auditor.py <proof_bundle.json>")
        sys.exit(1)
    
    # Allow flag syntax like --bundle file.json
    path = sys.argv[1]
    if path == "--bundle" and len(sys.argv) > 2:
        path = sys.argv[2]
    
    verify_bundle(path)
