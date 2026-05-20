package transparency

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/sha256"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"
	"math/big"
)

// P256Order is the curve order n of secp256r1 / P-256
var P256Order = func() *big.Int {
	n, _ := new(big.Int).SetString("ffffffff00000000ffffffffffffffffbce6fa148f9dc941655f8cef3f39803f", 16)
	return n
}()

// P256HalfOrder is floor(n/2) for Low-S validation checks
var P256HalfOrder = new(big.Int).Div(P256Order, big.NewInt(2))

// DecodedECDSA contains the extracted big.Int coordinates of a DER signature
type DecodedECDSA struct {
	R *big.Int
	S *big.Int
}

// VerifyECDSA performs sha256 ECDSA verification with strict pre-flight DER/ASN.1 validations
func VerifyECDSA(pubKeyPEM string, signature []byte, data []byte) (bool, error) {
	// 1. Strict pre-flight ASN.1 boundary check
	decoded, err := ValidateAndParseDEREcdsa(signature)
	if err != nil {
		return false, fmt.Errorf("[CRYPTO] Pre-flight DER check failed: %w", err)
	}

	// 2. Parse SPKI PEM Public Key
	block, _ := pem.Decode([]byte(pubKeyPEM))
	if block == nil {
		return false, errors.New("[CRYPTO] Failed to decode public key PEM block")
	}

	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return false, fmt.Errorf("[CRYPTO] Failed to parse public key: %w", err)
	}

	ecdsaPub, ok := pub.(*ecdsa.PublicKey)
	if !ok {
		return false, errors.New("[CRYPTO] Provided public key is not an ECDSA key")
	}

	if ecdsaPub.Curve != elliptic.P256() {
		return false, errors.New("[CRYPTO] Provided key is not on secp256r1 / P-256 curve")
	}

	// 3. Perform cryptographic validation
	hash := sha256.Sum256(data)
	isValid := ecdsa.Verify(ecdsaPub, hash[:], decoded.R, decoded.S)
	return isValid, nil
}

// ValidateAndParseDEREcdsa enforces exact DER sequence limits, trailing byte checks, and Low-S parity
func ValidateAndParseDEREcdsa(sig []byte) (*DecodedECDSA, error) {
	n := len(sig)
	if n < 8 {
		return nil, errors.New("[DER] Signature too short to be a valid DER sequence")
	}
	if sig[0] != 0x30 {
		return nil, errors.New("[DER] Invalid sequence tag (must be 0x30)")
	}

	totalLen := int(sig[1])
	if n != totalLen+2 {
		return nil, errors.New("[DER] Trailing bytes or mismatched total length in DER payload")
	}

	idx := 2

	// 1. Parse R Integer
	if sig[idx] != 0x02 {
		return nil, errors.New("[DER] Invalid tag for R (must be 0x02)")
	}
	lenR := int(sig[idx+1])
	if lenR <= 0 || idx+2+lenR > n {
		return nil, errors.New("[DER] Malformed length for R integer")
	}
	rBytes := sig[idx+2 : idx+2+lenR]

	// Enforce non-overlong integer padding rules
	if rBytes[0] == 0x00 && len(rBytes) > 1 && (rBytes[1]&0x80) == 0 {
		return nil, errors.New("[DER] Overlong integer padding in R")
	}
	if (rBytes[0] & 0x80) != 0 {
		return nil, errors.New("[DER] Negative integers not allowed in DER signature R")
	}

	idx += 2 + lenR

	// 2. Parse S Integer
	if idx >= n || sig[idx] != 0x02 {
		return nil, errors.New("[DER] Invalid tag for S (must be 0x02)")
	}
	lenS := int(sig[idx+1])
	if lenS <= 0 || idx+2+lenS != n {
		return nil, errors.New("[DER] Malformed length or trailing bytes after S integer")
	}
	sBytes := sig[idx+2 : idx+2+lenS]

	// Enforce non-overlong integer padding rules
	if sBytes[0] == 0x00 && len(sBytes) > 1 && (sBytes[1]&0x80) == 0 {
		return nil, errors.New("[DER] Overlong integer padding in S")
	}
	if (sBytes[0] & 0x80) != 0 {
		return nil, errors.New("[DER] Negative integers not allowed in DER signature S")
	}

	r := new(big.Int).SetBytes(rBytes)
	s := new(big.Int).SetBytes(sBytes)

	// 3. Strict Low-S check to prevent signature malleability
	if s.Cmp(P256HalfOrder) > 0 {
		return nil, errors.New("[DER] High-S signature rejected to prevent signature malleability")
	}

	return &DecodedECDSA{R: r, S: s}, nil
}
