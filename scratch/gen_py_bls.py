from py_ecc.bls.ciphersuites import G2Basic

class ZTANCiphersuite(G2Basic):
    DST = b'BLS_SIG_ZTAN_AUDIT_V1'

h3 = "e8bebb06cb303e0d09131a289ec1048a360817cd82d44a92c2c06df51a2f9f69"
msg = bytes.fromhex(h3)

sk1 = 1
sk2 = 2

sig1 = ZTANCiphersuite.Sign(sk1, msg)
sig2 = ZTANCiphersuite.Sign(sk2, msg)

agg = ZTANCiphersuite.Aggregate([sig1, sig2])

print(f"Aggregated Signature (Python): {agg.hex()}")

# Master PK
pk1 = ZTANCiphersuite.SkToPk(sk1)
pk2 = ZTANCiphersuite.SkToPk(sk2)
# Manually aggregate G1 points?
# py_ecc PKs are G1 elements (integers)
# We can just use Sign with (sk1 + sk2) to get the aggregate if it's additive
sk_total = sk1 + sk2
pk_total = ZTANCiphersuite.SkToPk(sk_total)
print(f"Master PK (Python): {pk_total.hex()}")
