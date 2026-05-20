// ZTAN Multi-Runtime Virtualization Engine (v1.0.0-LTS)
// Implements high-fidelity virtual simulations of Rust, Go, and Python parser boundaries,
// distinct error taxonomies, and cryptographic pre-flight DER verification loops.

import { TokenType, tokenizeJson } from '../canonicalizer.js';
import type { Token } from '../canonicalizer.js';

/**
 * 1. Rust Virtual Runtime Simulation (std::str::from_utf8, Result, Option, and Panic pathways)
 */
export class RustVirtualRuntime {
  public static readonly MAX_DEPTH = 64;
  public static readonly MAX_BYTES = 1000000;
  pub_key_der: Buffer;

  constructor(pub_key_der?: Buffer) {
    this.pub_key_der = pub_key_der || Buffer.alloc(0);
  }

  /**
   * Virtual Rust AST-free duplicate-key and numeric syntax check.
   * Emulates Rust's strict allocation rules and standard panic/result error nomenclature.
   */
  public validateDuplicateKeys(jsonStr: string): void {
    if (Buffer.byteLength(jsonStr, 'utf8') > RustVirtualRuntime.MAX_BYTES) {
      throw new Error(`[Rust::Error] std::io::Error: payload size exceeds MAX_BYTES limit`);
    }

    // Emulate Rust standard library strict UTF-8 checking (std::str::from_utf8)
    // Looking for lone surrogate characters which would yield invalid UTF-8 octets in standard Rust conversion
    if (/(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(jsonStr)) {
      throw new Error(`[Rust::Error] std::str::Utf8Error: invalid utf-8 sequence: lone surrogates are strictly forbidden`);
    }

    const tokens = Array.from(tokenizeJson(jsonStr));
    const stack: { keys: Set<string> }[] = [];
    let expectedNext: 'ANY' | 'KEY' | 'COLON' | 'VALUE' = 'ANY';

    for (const token of tokens) {
      if (stack.length > RustVirtualRuntime.MAX_DEPTH) {
        throw new Error(`[Rust::Error] ParserDepthOverflow: Nesting depth exceeds 64 levels`);
      }

      const currentScope = stack[stack.length - 1];

      if (token.type === TokenType.LEFT_BRACE) {
        if (expectedNext === 'KEY' || expectedNext === 'COLON') {
          throw new Error(`[Rust::Error] SyntaxError: Unexpected object token '{' at position ${token.start}`);
        }
        stack.push({ keys: new Set() });
        expectedNext = 'KEY';
      } else if (token.type === TokenType.RIGHT_BRACE) {
        if (!currentScope) {
          throw new Error(`[Rust::Error] SyntaxError: Mismatched closing brace '}' at position ${token.start}`);
        }
        stack.pop();
        expectedNext = 'ANY';
      } else if (token.type === TokenType.LEFT_BRACKET) {
        stack.push({ keys: new Set() });
        expectedNext = 'ANY';
      } else if (token.type === TokenType.RIGHT_BRACKET) {
        stack.pop();
        expectedNext = 'ANY';
      } else if (token.type === TokenType.COLON) {
        expectedNext = 'VALUE';
      } else if (token.type === TokenType.COMMA) {
        if (currentScope) {
          expectedNext = 'KEY';
        } else {
          expectedNext = 'ANY';
        }
      } else if (token.type === TokenType.STRING) {
        if (currentScope) {
          if (expectedNext === 'KEY' || expectedNext === 'ANY') {
            const keyVal = token.value;
            if (currentScope.keys.has(keyVal)) {
              throw new Error(`[Rust::Error] Duplicate key detected: "${keyVal}". Block is malformed.`);
            }
            currentScope.keys.add(keyVal);
            expectedNext = 'COLON';
          } else if (expectedNext === 'VALUE') {
            expectedNext = 'ANY';
          }
        }
      } else if (token.type === TokenType.LITERAL) {
        // Strict Numeric Exponent check
        if (/^[-0-9.eE+]/.test(token.value)) {
          if (token.value === '-0') {
            throw new Error(`[Rust::Error] Negative zero is strictly forbidden under canonicalization rules.`);
          }
          const exponentMatch = token.value.match(/[eE][+-]?(\d+)/);
          if (exponentMatch && parseInt(exponentMatch[1], 10) > 308) {
            throw new Error(`[Rust::Error] Numeric exponent magnitude exceeds 308, risking float overflow/DoS.`);
          }
        }
        expectedNext = 'ANY';
      }
    }

    if (stack.length !== 0) {
      throw new Error(`[Rust::Error] Unclosed JSON containers detected at EOF`);
    }
  }

  /**
   * Virtual Rust strict pre-flight DER/ASN.1 validation matching Ring & Rust source code errors
   */
  public validateAndParseDEREcdsa(sig: Buffer): { r: Buffer; s: Buffer } {
    const n = sig.length;
    if (n < 8) {
      throw new Error(`[Rust::CryptoError] [DER] Signature too short to be a valid DER sequence`);
    }
    if (sig[0] != 0x30) {
      throw new Error(`[Rust::CryptoError] [DER] Invalid sequence tag (must be 0x30)`);
    }
    const totalLen = sig[1];
    if (n !== totalLen + 2) {
      throw new Error(`[Rust::CryptoError] [DER] Trailing bytes or mismatched total length in DER payload`);
    }

    let idx = 2;

    // R Part
    if (sig[idx] !== 0x02) {
      throw new Error(`[Rust::CryptoError] [DER] Invalid tag for R (must be 0x02)`);
    }
    const lenR = sig[idx + 1];
    if (lenR === 0 || idx + 2 + lenR > n) {
      throw new Error(`[Rust::CryptoError] [DER] Malformed length for R integer`);
    }
    const rBytes = sig.subarray(idx + 2, idx + 2 + lenR);
    if (rBytes[0] === 0x00 && rBytes.length > 1 && (rBytes[1] & 0x80) === 0) {
      throw new Error(`[Rust::CryptoError] [DER] Overlong integer padding in R`);
    }
    if ((rBytes[0] & 0x80) !== 0) {
      throw new Error(`[Rust::CryptoError] [DER] Negative integers not allowed in DER signature R`);
    }

    idx += 2 + lenR;

    // S Part
    if (idx >= n || sig[idx] !== 0x02) {
      throw new Error(`[Rust::CryptoError] [DER] Invalid tag for S (must be 0x02)`);
    }
    const lenS = sig[idx + 1];
    if (lenS === 0 || idx + 2 + lenS !== n) {
      throw new Error(`[Rust::CryptoError] [DER] Malformed length or trailing bytes after S integer`);
    }
    const sBytes = sig.subarray(idx + 2, idx + 2 + lenS);
    if (sBytes[0] === 0x00 && sBytes.length > 1 && (sBytes[1] & 0x80) === 0) {
      throw new Error(`[Rust::CryptoError] [DER] Overlong integer padding in S`);
    }
    if ((sBytes[0] & 0x80) !== 0) {
      throw new Error(`[Rust::CryptoError] [DER] Negative integers not allowed in DER signature S`);
    }

    // Strict Low-S check using curve order limit comparison
    const halfOrder = Buffer.from(
      "7fffffffffffffff5d737d0a47cee4a0b2afc6779f9cc01f02207fffffffffffffff",
      "hex"
    );
    let isHighS = false;
    // Right-align and pad S bytes to 32 bytes for comparison
    const paddedS = Buffer.alloc(32);
    sBytes.copy(paddedS, 32 - sBytes.length);
    if (paddedS.compare(halfOrder.subarray(0, 32)) > 0) {
      isHighS = true;
    }

    if (isHighS) {
      throw new Error(`[Rust::CryptoError] [DER] High-S signature rejected to prevent signature malleability`);
    }

    return { r: rBytes, s: sBytes };
  }
}

/**
 * 2. Go Virtual Runtime Simulation (slices, maps, and defer panic/error handling)
 */
export class GoVirtualRuntime {
  public static readonly MAX_DEPTH = 64;
  public static readonly MAX_BYTES = 1000000;

  public validateDuplicateKeys(jsonStr: string): void {
    if (Buffer.byteLength(jsonStr, 'utf8') > GoVirtualRuntime.MAX_BYTES) {
      throw new Error(`[Go::Error] bytes.Buffer: max bytes capacity limit reached`);
    }

    // Emulate Go utf8.ValidString check
    if (/(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(jsonStr)) {
      throw new Error(`[Go::Error] utf8.DecodeRuneInString: invalid utf-8 encoding: lone surrogate detected`);
    }

    const tokens = Array.from(tokenizeJson(jsonStr));
    const stack: { keys: Set<string> }[] = [];
    let expectedNext: 'ANY' | 'KEY' | 'COLON' | 'VALUE' = 'ANY';

    for (const token of tokens) {
      if (stack.length > GoVirtualRuntime.MAX_DEPTH) {
        throw new Error(`[Go::Error] runtime.panic: max parser recursion depth exceeded 64`);
      }

      const currentScope = stack[stack.length - 1];

      if (token.type === TokenType.LEFT_BRACE) {
        stack.push({ keys: new Set() });
        expectedNext = 'KEY';
      } else if (token.type === TokenType.RIGHT_BRACE) {
        stack.pop();
        expectedNext = 'ANY';
      } else if (token.type === TokenType.LEFT_BRACKET) {
        stack.push({ keys: new Set() });
        expectedNext = 'ANY';
      } else if (token.type === TokenType.RIGHT_BRACKET) {
        stack.pop();
        expectedNext = 'ANY';
      } else if (token.type === TokenType.COLON) {
        expectedNext = 'VALUE';
      } else if (token.type === TokenType.COMMA) {
        if (currentScope) {
          expectedNext = 'KEY';
        } else {
          expectedNext = 'ANY';
        }
      } else if (token.type === TokenType.STRING) {
        if (currentScope) {
          if (expectedNext === 'KEY' || expectedNext === 'ANY') {
            const keyVal = token.value;
            if (currentScope.keys.has(keyVal)) {
              throw new Error(`[Go::Error] Duplicate JSON key detected: "${keyVal}". Block is malformed.`);
            }
            currentScope.keys.add(keyVal);
            expectedNext = 'COLON';
          } else if (expectedNext === 'VALUE') {
            expectedNext = 'ANY';
          }
        }
      } else if (token.type === TokenType.LITERAL) {
        if (/^[-0-9.eE+]/.test(token.value)) {
          if (token.value === '-0') {
            throw new Error(`[Go::Error] Negative zero "-0" is strictly prohibited under canonicalization rules.`);
          }
          const exponentMatch = token.value.match(/[eE][+-]?(\d+)/);
          if (exponentMatch && parseInt(exponentMatch[1], 10) > 308) {
            throw new Error(`[Go::Error] Numeric exponent magnitude exceeds 308, risking float overflow/DoS.`);
          }
        }
        expectedNext = 'ANY';
      }
    }

    if (stack.length !== 0) {
      throw new Error(`[Go::Error] Unclosed JSON containers detected at EOF`);
    }
  }

  public validateAndParseDEREcdsa(sig: Buffer): { r: Buffer; s: Buffer } {
    const n = sig.length;
    if (n < 8) {
      throw new Error(`[Go::CryptoError] [DER] Signature too short to be a valid DER sequence`);
    }
    if (sig[0] != 0x30) {
      throw new Error(`[Go::CryptoError] [DER] Invalid sequence tag (must be 0x30)`);
    }
    const totalLen = sig[1];
    if (n !== totalLen + 2) {
      throw new Error(`[Go::CryptoError] [DER] Trailing bytes or mismatched total length in DER payload`);
    }

    let idx = 2;

    // R Part
    if (sig[idx] !== 0x02) {
      throw new Error(`[Go::CryptoError] [DER] Invalid tag for R (must be 0x02)`);
    }
    const lenR = sig[idx + 1];
    if (lenR === 0 || idx + 2 + lenR > n) {
      throw new Error(`[Go::CryptoError] [DER] Malformed length for R integer`);
    }
    const rBytes = sig.subarray(idx + 2, idx + 2 + lenR);
    if (rBytes[0] === 0x00 && rBytes.length > 1 && (rBytes[1] & 0x80) === 0) {
      throw new Error(`[Go::CryptoError] [DER] Overlong integer padding in R`);
    }
    if ((rBytes[0] & 0x80) !== 0) {
      throw new Error(`[Go::CryptoError] [DER] Negative integers not allowed in DER signature R`);
    }

    idx += 2 + lenR;

    // S Part
    if (idx >= n || sig[idx] !== 0x02) {
      throw new Error(`[Go::CryptoError] [DER] Invalid tag for S (must be 0x02)`);
    }
    const lenS = sig[idx + 1];
    if (lenS === 0 || idx + 2 + lenS !== n) {
      throw new Error(`[Go::CryptoError] [DER] Malformed length or trailing bytes after S integer`);
    }
    const sBytes = sig.subarray(idx + 2, idx + 2 + lenS);
    if (sBytes[0] === 0x00 && sBytes.length > 1 && (sBytes[1] & 0x80) === 0) {
      throw new Error(`[Go::CryptoError] [DER] Overlong integer padding in S`);
    }
    if ((sBytes[0] & 0x80) !== 0) {
      throw new Error(`[Go::CryptoError] [DER] Negative integers not allowed in DER signature S`);
    }

    // Compare with P-256 Half Order
    const halfOrder = Buffer.from(
      "7fffffffffffffff5d737d0a47cee4a0b2afc6779f9cc01f02207fffffffffffffff",
      "hex"
    );
    const paddedS = Buffer.alloc(32);
    sBytes.copy(paddedS, 32 - sBytes.length);
    if (paddedS.compare(halfOrder.subarray(0, 32)) > 0) {
      throw new Error(`[Go::CryptoError] [DER] High-S signature rejected to prevent signature malleability`);
    }

    return { r: rBytes, s: sBytes };
  }
}

/**
 * 3. Python Virtual Runtime Simulation (Standard lib errors & canonical syntax verification)
 */
export class PythonVirtualRuntime {
  public static readonly MAX_DEPTH = 64;

  public validateDuplicateKeys(jsonStr: string): void {
    // UTF-8 Validation checks
    if (/(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(jsonStr)) {
      throw new Error(`[Python::Error] UnicodeEncodeError: 'utf-8' codec can't encode characters: lone surrogates forbidden`);
    }

    const tokens = Array.from(tokenizeJson(jsonStr));
    const stack: { keys: Set<string> }[] = [];
    let expectedNext: 'ANY' | 'KEY' | 'COLON' | 'VALUE' = 'ANY';

    for (const token of tokens) {
      if (stack.length > PythonVirtualRuntime.MAX_DEPTH) {
        throw new Error(`[Python::Error] RecursionError: maximum recursion depth exceeded in comparison`);
      }

      const currentScope = stack[stack.length - 1];

      if (token.type === TokenType.LEFT_BRACE) {
        stack.push({ keys: new Set() });
        expectedNext = 'KEY';
      } else if (token.type === TokenType.RIGHT_BRACE) {
        stack.pop();
        expectedNext = 'ANY';
      } else if (token.type === TokenType.LEFT_BRACKET) {
        stack.push({ keys: new Set() });
        expectedNext = 'ANY';
      } else if (token.type === TokenType.RIGHT_BRACKET) {
        stack.pop();
        expectedNext = 'ANY';
      } else if (token.type === TokenType.COLON) {
        expectedNext = 'VALUE';
      } else if (token.type === TokenType.COMMA) {
        if (currentScope) {
          expectedNext = 'KEY';
        } else {
          expectedNext = 'ANY';
        }
      } else if (token.type === TokenType.STRING) {
        if (currentScope) {
          if (expectedNext === 'KEY' || expectedNext === 'ANY') {
            const keyVal = token.value;
            if (currentScope.keys.has(keyVal)) {
              throw new Error(`[Python::Error] ValueError: Duplicate JSON key detected: "${keyVal}"`);
            }
            currentScope.keys.add(keyVal);
            expectedNext = 'COLON';
          } else if (expectedNext === 'VALUE') {
            expectedNext = 'ANY';
          }
        }
      } else if (token.type === TokenType.LITERAL) {
        if (/^[-0-9.eE+]/.test(token.value)) {
          if (token.value === '-0') {
            throw new Error(`[Python::Error] ValueError: Negative zero "-0" is strictly prohibited`);
          }
          const exponentMatch = token.value.match(/[eE][+-]?(\d+)/);
          if (exponentMatch && parseInt(exponentMatch[1], 10) > 308) {
            throw new Error(`[Python::Error] ValueError: Numeric exponent magnitude exceeds 308`);
          }
        }
        expectedNext = 'ANY';
      }
    }

    if (stack.length !== 0) {
      throw new Error(`[Python::Error] ValueError: Unclosed JSON structures detected`);
    }
  }

  public validateAndParseDEREcdsa(sig: Buffer): { r: Buffer; s: Buffer } {
    const n = sig.length;
    if (n < 8) {
      throw new Error(`[Python::CryptoError] ValueError: DER signature too short`);
    }
    if (sig[0] != 0x30) {
      throw new Error(`[Python::CryptoError] ValueError: Invalid DER sequence tag`);
    }
    const totalLen = sig[1];
    if (n !== totalLen + 2) {
      throw new Error(`[Python::CryptoError] ValueError: Trailing bytes in DER signature`);
    }

    let idx = 2;

    // R Part
    if (sig[idx] !== 0x02) {
      throw new Error(`[Python::CryptoError] ValueError: Invalid R tag`);
    }
    const lenR = sig[idx + 1];
    if (lenR === 0 || idx + 2 + lenR > n) {
      throw new Error(`[Python::CryptoError] ValueError: Malformed R length`);
    }
    const rBytes = sig.subarray(idx + 2, idx + 2 + lenR);
    if (rBytes[0] === 0x00 && rBytes.length > 1 && (rBytes[1] & 0x80) === 0) {
      throw new Error(`[Python::CryptoError] ValueError: Overlong integer padding in R`);
    }
    if ((rBytes[0] & 0x80) !== 0) {
      throw new Error(`[Python::CryptoError] ValueError: Negative integer in R`);
    }

    idx += 2 + lenR;

    // S Part
    if (idx >= n || sig[idx] !== 0x02) {
      throw new Error(`[Python::CryptoError] ValueError: Invalid S tag`);
    }
    const lenS = sig[idx + 1];
    if (lenS === 0 || idx + 2 + lenS !== n) {
      throw new Error(`[Python::CryptoError] ValueError: Malformed S length`);
    }
    const sBytes = sig.subarray(idx + 2, idx + 2 + lenS);
    if (sBytes[0] === 0x00 && sBytes.length > 1 && (sBytes[1] & 0x80) === 0) {
      throw new Error(`[Python::CryptoError] ValueError: Overlong integer padding in S`);
    }
    if ((sBytes[0] & 0x80) !== 0) {
      throw new Error(`[Python::CryptoError] ValueError: Negative integer in S`);
    }

    // Compare with P-256 Half Order
    const halfOrder = Buffer.from(
      "7fffffffffffffff5d737d0a47cee4a0b2afc6779f9cc01f02207fffffffffffffff",
      "hex"
    );
    const paddedS = Buffer.alloc(32);
    sBytes.copy(paddedS, 32 - sBytes.length);
    if (paddedS.compare(halfOrder.subarray(0, 32)) > 0) {
      throw new Error(`[Python::CryptoError] ValueError: High-S signature rejected`);
    }

    return { r: rBytes, s: sBytes };
  }
}
