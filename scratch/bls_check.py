from py_ecc.bls import G2Basic
import hashlib

identity = "SEC-GOV-01"
seed = f"SECRET_{identity}".encode('utf-8')
sk_bytes = hashlib.sha256(seed).digest()
sk_int = int.from_bytes(sk_bytes, byteorder='big')

# Try passing int
try:
    pk_bytes = G2Basic.SkToPk(sk_int)
    print(f"PK Hex (from int): {pk_bytes.hex()}")
except Exception as e:
    print(f"Failed from int: {e}")

# Try passing bytes
try:
    pk_bytes = G2Basic.SkToPk(sk_bytes)
    print(f"PK Hex (from bytes): {pk_bytes.hex()}")
except Exception as e:
    print(f"Failed from bytes: {e}")
