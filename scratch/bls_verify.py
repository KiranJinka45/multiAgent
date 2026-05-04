from py_ecc.bls import G2Basic
import hashlib

sig_hex = "a794face7bebb07f53c724e411cda64d62cc6d9bc1db0e656d086c84ffe48376f9dedde18fc4f14fb001ae3c3b2a2bbf134ab0e14ca027c566b8cbbd2a01c1794ca32ac0301ae5fed9ddb6b13f7e308fb20a6357388c44a125b33320759b2e50"
msg_hex = "a2d7ef152e03496365f827cdbb193e355b8e3a8c1288fd274dd54c6d44347a41"
pk_hex = "a75eb36b3dccd7af50d0d896b2ecf56a16f2100754aad233486fa0e703f6783b27be394d7e6bfce0e9303ef8bb233ad5"

sig = bytes.fromhex(sig_hex)
msg = bytes.fromhex(msg_hex)
pk = bytes.fromhex(pk_hex)

is_valid = G2Basic.Verify(pk, msg, sig)
print(f"Is Valid: {is_valid}")
