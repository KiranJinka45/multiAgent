import hashlib
import json
from py_ecc.bls.ciphersuites import G2Basic

class ZTANCiphersuite(G2Basic):
    DST = b'BLS_SIG_ZTAN_AUDIT_V1'

    @classmethod
    def SignWithContext(cls, SK, message, context=None):
        final_msg = message
        if context:
            ctx_bytes = context.encode('utf-8') if isinstance(context, str) else context
            final_msg = hashlib.sha256(ctx_bytes + message).digest()
        return cls.Sign(SK, final_msg)

    @classmethod
    def AggregateSignatures(cls, signatures):
        points = [cls.signature_to_G2(sig) for sig in signatures]
        aggregated_point = points[0]
        for p in points[1:]:
            aggregated_point = cls.pairing.add(aggregated_point, p)
        return cls.G2_to_signature(aggregated_point)

def gen_vectors():
    # SKs for A, B, C
    skA = 1
    skB = 2
    skC = 3
    
    pkA = ZTANCiphersuite.SkToPk(skA)
    pkB = ZTANCiphersuite.SkToPk(skB)
    pkC = ZTANCiphersuite.SkToPk(skC)
    
    master_pk_point = ZTANCiphersuite.pairing.add(ZTANCiphersuite.SkToPk(skA), ZTANCiphersuite.SkToPk(skB))
    # Wait, master PK in simulation is just aggregate of all? No, in my DKG simulation it was random.
    # But for a deterministic test, I'll just use known SKs.
    
    message_hash = bytes.fromhex("e8bebb06cb303e0d09131a289ec1048a360817cd82d44a92c2c06df51a2f9f69")
    context = "ceremony-v1"
    
    sigA = ZTANCiphersuite.SignWithContext(skA, message_hash, context)
    sigB = ZTANCiphersuite.SignWithContext(skB, message_hash, context)
    agg = ZTANCiphersuite.AggregateSignatures([sigA, sigB])
    
    master_pk = ZTANCiphersuite.pairing.add(pkA, pkB) # Threshold 2/2 for simplicity here
    
    print(f"Master PK: {master_pk.hex()}")
    print(f"Aggregate Signature: {agg.hex()}")
    print(f"Context: {context}")

if __name__ == "__main__":
    gen_vectors()
