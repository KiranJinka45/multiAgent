# ZTAN Physical Hardware Certification Record

**Timestamp:** 2026-06-10T06:02:15.682Z  
**Platform:** linux / 6.6.87.2-microsoft-standard-WSL2 / x64  
**Final Verdict:** `PARTIAL_WSL_CERTIFIED`

## 1. Virtualization Capabilities Check
- **KVM Device (/dev/kvm) Exist:** ✅ YES  
- **KVM Writable by User:** ✅ YES  
- **Firecracker Binary Found:** ✅ YES (/usr/local/bin/firecracker)  
- **Jailer Binary Found:** ✅ YES (/usr/local/bin/jailer)  

## 2. Real MicroVM Isolation Test
- **MicroVM Spawned:** ✅ SUCCESS  
- **Guest Command Output:** `Hello from true Firecracker isolated microVM! Kernel: 4.14.174`  
- **Execution Time:** `17050 ms`  
- **Resource Cleanup Swept:** ✅ YES  

## 3. TPM Attestation Check
- **TPM Device (/dev/tpm0) Exist:** ❌ NO  
- **Attestation Mode:** `SIMULATED`  
- **Challenge Nonce:** `65fd9e74ca6d3e6573372bfc856c8412a320fa632a06f908213f6ca370fcbdeb`  
- **Attestation Verified:** ✅ YES  

### Measured PCR Values:
```json
{
  "0": "e4e06e4a0053362c00510c4eff5c9797c76b0e2d236c966378c6b74220dcf1c9",
  "7": "5e4311ee3d5d5d386f1a6a59edb321545be255dbd128fe668b20c3643f29ed4a",
  "10": "94fb09e99836f3d77bf8a3d0fc058421d917778bc5cd652638f1236ea43eed19"
}
```

## 4. Forensic Evaluation Conclusion
> **[QUALIFIED] PARTIAL HYBRID WSL2 HOST CERTIFIED**  
> The system has successfully validated true KVM hypervisor execution, guest-to-host vsock communication, and microVM teardown under a WSL2 Linux kernel environment. Cryptographic TPM attestation is validated using simulated challenge-response quotes due to WSL2 platform boundaries.  
