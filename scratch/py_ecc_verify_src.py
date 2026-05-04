from py_ecc.bls.ciphersuites import G2Basic
from py_ecc.bls import G2Basic as G2BasicInstance

class ZTANCiphersuite(G2Basic):
    DST = b'BLS_SIG_ZTAN_AUDIT_V1'

# Check if Verify uses self.DST
import inspect
print(f"Verify source: {inspect.getsource(G2Basic.Verify)}")
