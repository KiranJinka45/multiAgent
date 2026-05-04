from py_ecc.bls.ciphersuites import G2Basic
import inspect

print(f"G2Basic class: {G2Basic}")
# Check if it has a DST attribute
try:
    print(f"Default DST: {G2Basic.DST}")
except:
    print("No DST attribute on class")

# Can we instantiate it with a custom DST?
try:
    custom = G2Basic(dst=b'BLS_SIG_ZTAN_AUDIT_V1')
    print("Can instantiate with custom DST")
except Exception as e:
    print(f"Cannot instantiate: {e}")

# Let's check G2Basic.Verify again
print(f"G2Basic.Verify signature: {inspect.signature(G2Basic.Verify)}")
