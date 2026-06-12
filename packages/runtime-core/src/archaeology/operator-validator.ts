import crypto from 'crypto';

export class OperatorValidator {
    /**
     * Verifies if a given string has a valid Base64 / Base64URL signature encoding layout.
     */
    public static isValidBase64(str: string): boolean {
        // Remove 'sig:' prefix if present
        const sanitized = str.startsWith('sig:') ? str.slice(4) : str;
        
        // Match standard Base64 or Base64URL pattern
        const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
        const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
        
        return base64Regex.test(sanitized) || base64UrlRegex.test(sanitized);
    }

    /**
     * Verifies that the SRE override signature payload matches NIST P-256 (ECDSA SHA-256) layout rules.
     * In DER format, P-256 signatures are typically between 70 and 72 bytes.
     * In raw (IEEE P1363) format, P-256 signatures are exactly 64 bytes.
     */
    public static verifyP256SignatureLayout(signatureBase64: string): boolean {
        try {
            if (!this.isValidBase64(signatureBase64)) {
                return false;
            }
            
            const sanitized = signatureBase64.startsWith('sig:') ? signatureBase64.slice(4) : signatureBase64;
            const buffer = Buffer.from(sanitized, 'base64');
            
            // Check raw signature byte length (64 bytes representing r and s values)
            if (buffer.length === 64) {
                return true;
            }
            
            // Check DER encoded signature byte length bounds
            if (buffer.length >= 8 && buffer.length <= 73) {
                // Ensure correct ASN.1 DER sequence marker (0x30)
                return buffer[0] === 0x30;
            }
            
            return false;
        } catch (_e) {
            return false;
        }
    }
}
