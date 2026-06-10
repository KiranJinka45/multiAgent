# ZTAN Physical TPM Attestation Record

**Timestamp:** 2026-06-10T15:23:02.924Z  
**Platform:** win32 / 10.0.26200 / x64  
**Attestation Mode:** `SIMULATED`  
**TPM Nonce:** `89559deb236364d2a806fa7a1f102f171277623c57fe05918e7b360f672f1079`  
**TPM Quote Verified:** ✅ YES  

## Verification Details

1. **TPM 2.0 Device Node Availability:** ❌ Missing  
2. **Attestation Key Signature Verification:** ✅ Cryptographically Validated  
3. **Endorsement Key Certificate Chain:** ⚠️ Not Extracted (Simulated/Absent)  

### Measured PCR Register Values

```json
{
  "0": "e4e06e4a0053362c00510c4eff5c9797c76b0e2d236c966378c6b74220dcf1c9",
  "7": "5e4311ee3d5d5d386f1a6a59edb321545be255dbd128fe668b20c3643f29ed4a",
  "10": "94fb09e99836f3d77bf8a3d0fc058421d917778bc5cd652638f1236ea43eed19"
}
```

### Environment Qualification Delta (Active Deviations)

- ⚠️ **Qualification**: Missing physical TPM 2.0 device node (/dev/tpm0) on host
- ⚠️ **Qualification**: Virtualization detected: running in windows container/VM
- ⚠️ **Qualification**: Using software-simulated TPM quote verification (simulated keys and mock PCR registers)

*Note: These qualifications do not block certification but indicate deviations from the nominal physical bare-metal hardware baseline.*

## Verdict

> **[QUALIFIED] Simulated TPM 2.0 Approved with Qualifications**  
> Attestation quote was generated and validated using the software-simulated TPM quote engine due to lack of native hardware TPM on host.  
