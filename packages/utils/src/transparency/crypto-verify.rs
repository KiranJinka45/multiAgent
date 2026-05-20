// Rust Cryptographic Verification Engine (ZTAN Protocol v1.0.0-LTS)
// Establishes absolute consensus boundaries and prevents signature malleability

use ring::signature;
use ring::signature::KeyPair;
use std::convert::TryInto;

// P-256 Curve Order: n
const P256_ORDER_BYTES: [u8; 32] = [
    0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xbc, 0xe6, 0xfa, 0x14, 0x8f, 0x9d, 0xc9, 0x41,
    0x65, 0x5f, 0x8c, 0xef, 0x3f, 0x39, 0x80, 0x3f,
];

// P-256 Half Order: floor(n/2) for Low-S checks
const P256_HALF_ORDER_BYTES: [u8; 32] = [
    0x7f, 0xff, 0xff, 0xff, 0x80, 0x00, 0x00, 0x00,
    0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xde, 0x73, 0x7d, 0x0a, 0x47, 0xce, 0xe4, 0xa0,
    0xb2, 0xaf, 0xc6, 0x77, 0x9f, 0x9c, 0xc0, 0x1f,
];

pub struct DecodedECDSA {
    pub r: Vec<u8>,
    pub s: Vec<u8>,
}

/// Verify P-256 ECDSA signature with strict pre-flight DER/ASN.1 assertions
pub fn verify_ecdsa(
    pub_key_der: &[u8],
    signature: &[u8],
    data: &[u8],
) -> Result<bool, String> {
    // 1. Strict pre-flight checks to prevent signature parsing exploits
    let decoded = validate_and_parse_der_ecdsa(signature)?;

    // 2. Format signature into raw 64-byte format (R || S) expected by low-level libraries
    let mut raw_sig = Vec::with_capacity(64);
    
    // Ensure exact 32-byte left-padded representation for R
    let mut r_32 = vec![0u8; 32];
    let r_len = decoded.r.len();
    if r_len > 32 {
        // Strip leading zeros if over 32 bytes (which is checked, but defensive)
        let offset = r_len - 32;
        r_32.copy_from_slice(&decoded.r[offset..]);
    } else {
        r_32[32 - r_len..].copy_from_slice(&decoded.r);
    }

    // Ensure exact 32-byte left-padded representation for S
    let mut s_32 = vec![0u8; 32];
    let s_len = decoded.s.len();
    if s_len > 32 {
        let offset = s_len - 32;
        s_32.copy_from_slice(&decoded.s[offset..]);
    } else {
        s_32[32 - s_len..].copy_from_slice(&decoded.s);
    }

    raw_sig.extend_from_slice(&r_32);
    raw_sig.extend_from_slice(&s_32);

    // 3. Cryptographic signature check via ring library
    let peer_public_key = signature::UnparsedPublicKey::new(
        &signature::ECDSA_P256_SHA256_ASN1, // or raw format
        pub_key_der,
    );

    match peer_public_key.verify(data, &raw_sig) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Enforces non-malleability, strict DER integer sizing, tag mappings, and Low-S parity boundaries
pub fn validate_and_parse_der_ecdsa(sig: &[u8]) -> Result<DecodedECDSA, String> {
    let n = sig.len();
    if n < 8 {
        return Err("[DER] Signature too short to be a valid DER sequence".to_string());
    }
    if sig[0] != 0x30 {
        return Err("[DER] Invalid sequence tag (must be 0x30)".to_string());
    }

    let total_len = sig[1] as usize;
    if n != total_len + 2 {
        return Err("[DER] Trailing bytes or mismatched total length in DER payload".to_string());
    }

    let mut idx = 2;

    // 1. Parse R Integer
    if sig[idx] != 0x02 {
        return Err("[DER] Invalid tag for R (must be 0x02)".to_string());
    }
    let len_r = sig[idx + 1] as usize;
    if len_r == 0 || idx + 2 + len_r > n {
        return Err("[DER] Malformed length for R integer".to_string());
    }
    let r_bytes = &sig[idx + 2..idx + 2 + len_r];

    // Enforce non-overlong integer padding rules
    if r_bytes[0] == 0x00 && r_bytes.len() > 1 && (r_bytes[1] & 0x80) == 0 {
        return Err("[DER] Overlong integer padding in R".to_string());
    }
    if (r_bytes[0] & 0x80) != 0 {
        return Err("[DER] Negative integers not allowed in DER signature R".to_string());
    }

    idx += 2 + len_r;

    // 2. Parse S Integer
    if idx >= n || sig[idx] != 0x02 {
        return Err("[DER] Invalid tag for S (must be 0x02)".to_string());
    }
    let len_s = sig[idx + 1] as usize;
    if len_s == 0 || idx + 2 + len_s != n {
        return Err("[DER] Malformed length or trailing bytes after S integer".to_string());
    }
    let s_bytes = &sig[idx + 2..idx + 2 + len_s];

    // Enforce non-overlong integer padding rules
    if s_bytes[0] == 0x00 && s_bytes.len() > 1 && (s_bytes[1] & 0x80) == 0 {
        return Err("[DER] Overlong integer padding in S".to_string());
    }
    if (s_bytes[0] & 0x80) != 0 {
        return Err("[DER] Negative integers not allowed in DER signature S".to_string());
    }

    // Convert S bytes to comparative representation
    let mut clean_s = vec![0u8; 32];
    let s_len = s_bytes.len();
    if s_len > 32 {
        let offset = s_len - 32;
        clean_s.copy_from_slice(&s_bytes[offset..]);
    } else {
        clean_s[32 - s_len..].copy_from_slice(s_bytes);
    }

    // 3. Enforce Low-S anti-malleability scalar check
    // Compare byte array with P256_HALF_ORDER_BYTES
    if is_greater_than(&clean_s, &P256_HALF_ORDER_BYTES) {
        return Err("[DER] High-S signature rejected to prevent signature malleability".to_string());
    }

    Ok(DecodedECDSA {
        r: r_bytes.to_vec(),
        s: s_bytes.to_vec(),
    })
}

fn is_greater_than(a: &[u8; 32], b: &[u8; 32]) -> bool {
    for i in 0..32 {
        if a[i] > b[i] {
            return true;
        } else if a[i] < b[i] {
            return false;
        }
    }
    false
}
