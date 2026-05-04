from py_ecc.bls.ciphersuites import G2Basic

class ZTANCiphersuite(G2Basic):
    DST = b'BLS_SIG_ZTAN_AUDIT_V1'

h3 = "e8bebb06cb303e0d09131a289ec1048a360817cd82d44a92c2c06df51a2f9f69"
msg = bytes.fromhex(h3)

sk1 = 1
pk1 = ZTANCiphersuite.SkToPk(sk1)

# Node Sig1
node_sig1 = "a2c4603513646523e68dfda81bbecad0b4ab915c7663268f4501bfa0573ec61558c565fea3a91a859ebd8a49a85c5d82005df029d1d945dfd394edacadf610f073da4a79279859535e9d686a8eba4023364cb34878ec5d449a337c7d9ddd657f"

try:
    is_valid = ZTANCiphersuite.Verify(pk1, msg, bytes.fromhex(node_sig1))
    print(f"Python Verification of Node Sig: {is_valid}")
except Exception as e:
    print(f"Python Verification Error: {str(e)}")
