import * as crypto from 'node:crypto';

// Hardened Operational Safety Limits (Priority 4)
const MAX_DEPTH = 64;
const MAX_BYTES = 1_000_000; // 1 MB payload ceiling
const MAX_KEYS = 10_000;
const MAX_STRING = 65_536; // 64 KB maximum string length

/**
 * Deterministic JSON Canonicalization Scheme (JCS) - RFC 8785 Compliant Subset
 * Enforces Unicode NFC Normalization, lexicographical key sorting, strict float formatting,
 * circular reference protection, and explicit resource exhaustion limits.
 */
export function canonicalizeJCS(
  value: any,
  seenObjects: Set<any> = new Set(),
  depth = 0
): string {
  // 1. Resource Exhaustion Depth Limit Check
  if (depth > MAX_DEPTH) {
    throw new Error(`[JCS] Maximum nesting depth of ${MAX_DEPTH} exceeded.`);
  }

  if (value === null) {
    return 'null';
  }
  
  if (typeof value === 'string') {
    // 2. Resource Limit: Maximum String Length
    if (value.length > MAX_STRING) {
      throw new Error(`[JCS] Maximum string length of ${MAX_STRING} exceeded.`);
    }

    // Reject Lone Surrogates to prevent UTF-8 serialization inconsistencies
    if (/(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(value)) {
      throw new Error('[JCS] Lone surrogates are strictly forbidden to prevent UTF-8 encoding anomalies.');
    }

    // Enforce Unicode NFC Normalization
    const normalized = value.normalize('NFC');
    
    // Perform RFC 8785 Compliant JSON String Escaping
    const escaped = JSON.stringify(normalized);
    if (escaped.length > MAX_STRING * 2) { // Allow margin for escape slashes
      throw new Error(`[JCS] Escaped string value exceeds maximum serialization safety limits.`);
    }
    return escaped;
  }
  
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('[JCS] Non-finite number values (Infinity, NaN) are strictly forbidden.');
    }
    if (Object.is(value, -0)) {
      return '0';
    }
    let str = value.toString().toLowerCase();
    // Enforce lowercase exponent and strip redundant positive sign (+) in e.g. 1e+21
    str = str.replace(/e\+?/, 'e');
    return str;
  }
  
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  
  if (Array.isArray(value)) {
    const items = value.map(item => canonicalizeJCS(item, seenObjects, depth + 1));
    const result = '[' + items.join(',') + ']';
    if (result.length > MAX_BYTES) {
      throw new Error(`[JCS] Serialized array output exceeds maximum byte limit of ${MAX_BYTES}.`);
    }
    return result;
  }
  
  if (typeof value === 'object') {
    // 3. Circular Reference Protection
    if (seenObjects.has(value)) {
      throw new Error('[JCS] Circular structure detected; serialization aborted.');
    }
    seenObjects.add(value);

    // 4. Resource Limit: Enforces key count ceiling strictly PER individual JSON object scope (non-cumulative)
    const sortedKeys = Object.keys(value).sort();
    if (sortedKeys.length > MAX_KEYS) {
      throw new Error(`[JCS] Maximum object keys limit of ${MAX_KEYS} exceeded in a single scope.`);
    }
    
    const parts = sortedKeys.map(key => {
      if (key.length > MAX_STRING) {
        throw new Error(`[JCS] Object key exceeds maximum length of ${MAX_STRING}.`);
      }
      const canonicalKey = JSON.stringify(key.normalize('NFC'));
      const canonicalVal = canonicalizeJCS(value[key], seenObjects, depth + 1);
      return `${canonicalKey}:${canonicalVal}`;
    });

    seenObjects.delete(value);
    const result = '{' + parts.join(',') + '}';
    if (result.length > MAX_BYTES) {
      throw new Error(`[JCS] Serialized object output exceeds maximum byte limit of ${MAX_BYTES}.`);
    }
    return result;
  }
  
  throw new Error(`[JCS] Unsupported data type: ${typeof value}`);
}

/**
 * Validates a JSON string block for duplicate keys before standard JS engine
 * parsers overwrite duplicate fields silently. Integrates nested depth controls
 * and string ceiling limits to prevent parser differential memory exhaustion.
 */
export enum TokenType {
  LEFT_BRACE = 'LEFT_BRACE',
  RIGHT_BRACE = 'RIGHT_BRACE',
  LEFT_BRACKET = 'LEFT_BRACKET',
  RIGHT_BRACKET = 'RIGHT_BRACKET',
  COLON = 'COLON',
  COMMA = 'COMMA',
  STRING = 'STRING',
  LITERAL = 'LITERAL'
}

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

export function* tokenizeJson(jsonStr: string): Generator<Token, void, unknown> {
  const n = jsonStr.length;
  let i = 0;

  while (i < n) {
    const char = jsonStr[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (char === '{') {
      yield { type: TokenType.LEFT_BRACE, value: '{', start: i, end: i + 1 };
      i++;
    } else if (char === '}') {
      yield { type: TokenType.RIGHT_BRACE, value: '}', start: i, end: i + 1 };
      i++;
    } else if (char === '[') {
      yield { type: TokenType.LEFT_BRACKET, value: '[', start: i, end: i + 1 };
      i++;
    } else if (char === ']') {
      yield { type: TokenType.RIGHT_BRACKET, value: ']', start: i, end: i + 1 };
      i++;
    } else if (char === ':') {
      yield { type: TokenType.COLON, value: ':', start: i, end: i + 1 };
      i++;
    } else if (char === ',') {
      yield { type: TokenType.COMMA, value: ',', start: i, end: i + 1 };
      i++;
    } else if (char === '"') {
      // String token extraction
      const start = i;
      let keyVal = '';
      i++; // skip opening quote

      while (i < n && jsonStr[i] !== '"') {
        if (jsonStr[i] === '\\') {
          const nextChar = jsonStr[i + 1] || '';
          keyVal += '\\' + nextChar;
          i += 2;
        } else {
          keyVal += jsonStr[i];
          i++;
        }

        if (keyVal.length > MAX_STRING) {
          throw new Error(`[JCS] Parsed string token exceeds safety limit of ${MAX_STRING} characters.`);
        }
      }

      if (i >= n) {
        throw new Error('[JCS] Unterminated string literal detected.');
      }
      i++; // skip closing quote

      // Reject Lone Surrogates in strings/keys
      if (/(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(keyVal)) {
        throw new Error('[JCS] Lone surrogates are strictly forbidden to prevent UTF-8 encoding anomalies.');
      }

      yield { type: TokenType.STRING, value: keyVal, start, end: i };
    } else {
      // Literal/Numeric token extraction (e.g. true, false, null, -12.3e5, etc.)
      const start = i;
      let litVal = '';
      
      // Consume characters until we hit a delimiter (whitespace, comma, brace, bracket, colon)
      while (i < n && !/\s/.test(jsonStr[i]) && !/[{}[\]:,]/.test(jsonStr[i])) {
        litVal += jsonStr[i];
        i++;
      }

      // Enforce literal constraints:
      // Valid unquoted strings in JSON are strictly boolean primitives, null, or valid numeric literals.
      if (/[a-zA-Z]/.test(litVal)) {
        const words = litVal.match(/[a-zA-Z]+/g) || [];
        for (const word of words) {
          if (word !== 'true' && word !== 'false' && word !== 'null' && word !== 'e' && word !== 'E') {
            throw new Error(`[JCS] Invalid unquoted literal or identifier detected: "${word}".`);
          }
        }
      }

      // Enforce strict numeric grammar constraints for any numeric-like literal
      if (/^[-0-9.eE+]/.test(litVal)) {
        if (litVal.length > 100) {
          throw new Error('[JCS] Numeric literal length exceeds safety limit of 100 characters.');
        }
        
        // Strict JSON Number Syntax Regex (RFC 8259)
        const jsonNumberRegex = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
        if (!jsonNumberRegex.test(litVal)) {
          throw new Error(`[JCS] Malformed numeric literal detected: "${litVal}".`);
        }

        // Canonical constraint: Prohibit negative zero
        if (litVal === '-0') {
          throw new Error('[JCS] Negative zero "-0" is strictly prohibited under canonicalization rules.');
        }

        // Exponent magnitude verification
        const exponentMatch = litVal.match(/[eE][+-]?(\d+)/);
        if (exponentMatch && parseInt(exponentMatch[1], 10) > 308) {
          throw new Error('[JCS] Numeric exponent magnitude exceeds 308, risking float overflow/DoS.');
        }
      }

      yield { type: TokenType.LITERAL, value: litVal, start, end: i };
    }
  }
}

/**
 * Validates a JSON string block for duplicate keys before standard JS engine
 * parsers overwrite duplicate fields silently. Integrates nested depth controls
 * and string ceiling limits to prevent parser differential memory exhaustion.
 */
export function validateDuplicateKeys(jsonStr: string): void {
  // Pre-parse length check
  if (jsonStr.length > MAX_BYTES) {
    throw new Error(`[JCS] JSON payload of ${jsonStr.length} bytes exceeds MAX_BYTES buffer of ${MAX_BYTES}.`);
  }

  if (!jsonStr.trim()) {
    throw new Error('[JCS] Empty JSON payload.');
  }

  const stack: { type: 'OBJECT' | 'ARRAY'; keys: Set<string> }[] = [];
  const tokens = tokenizeJson(jsonStr);

  let expectedNext: 'ANY' | 'KEY' | 'COLON' | 'VALUE' = 'ANY';
  let hasClosedRoot = false;
  let rootOpened = false;

  for (const token of tokens) {
    if (hasClosedRoot) {
      throw new Error(`[JCS] Unexpected trailing token at position ${token.start}.`);
    }

    if (token.type === TokenType.LEFT_BRACE || token.type === TokenType.LEFT_BRACKET) {
      rootOpened = true;
    }

    // Nesting depth boundary checks
    if (stack.length > MAX_DEPTH) {
      throw new Error(`[JCS] Parser nesting depth limit of ${MAX_DEPTH} exceeded.`);
    }

    const currentScope = stack[stack.length - 1];

    if (token.type === TokenType.LEFT_BRACE) {
      if (expectedNext === 'KEY' || expectedNext === 'COLON') {
        throw new Error(`[JCS] Unexpected object token '{' at position ${token.start}.`);
      }
      stack.push({ type: 'OBJECT', keys: new Set() });
      expectedNext = 'KEY';
    } else if (token.type === TokenType.RIGHT_BRACE) {
      if (!currentScope || currentScope.type !== 'OBJECT') {
        throw new Error(`[JCS] Mismatched closing brace '}' at position ${token.start}.`);
      }
      if (expectedNext === 'COLON' || expectedNext === 'VALUE') {
        throw new Error(`[JCS] Unexpected closing brace '}' at position ${token.start}.`);
      }
      stack.pop();
      expectedNext = 'ANY';

      if (rootOpened && stack.length === 0) {
        hasClosedRoot = true;
      }
    } else if (token.type === TokenType.LEFT_BRACKET) {
      if (expectedNext === 'KEY' || expectedNext === 'COLON') {
        throw new Error(`[JCS] Unexpected array token '[' at position ${token.start}.`);
      }
      stack.push({ type: 'ARRAY', keys: new Set() });
      expectedNext = 'ANY';
    } else if (token.type === TokenType.RIGHT_BRACKET) {
      if (!currentScope || currentScope.type !== 'ARRAY') {
        throw new Error(`[JCS] Mismatched closing bracket ']' at position ${token.start}.`);
      }
      stack.pop();
      expectedNext = 'ANY';

      if (rootOpened && stack.length === 0) {
        hasClosedRoot = true;
      }
    } else if (token.type === TokenType.COLON) {
      if (expectedNext !== 'COLON') {
        throw new Error(`[JCS] Unexpected colon ':' at position ${token.start}.`);
      }
      expectedNext = 'VALUE';
    } else if (token.type === TokenType.COMMA) {
      if (expectedNext !== 'ANY') {
        throw new Error(`[JCS] Unexpected comma ',' at position ${token.start}.`);
      }
      if (currentScope && currentScope.type === 'OBJECT') {
        expectedNext = 'KEY';
      } else {
        expectedNext = 'ANY';
      }
    } else if (token.type === TokenType.STRING) {
      if (currentScope && currentScope.type === 'OBJECT') {
        if (expectedNext === 'KEY' || expectedNext === 'ANY') {
          const keyVal = token.value;
          if (currentScope.keys.size >= MAX_KEYS) {
            throw new Error(`[JCS] Lexical keys count in scope exceeds safe limit of ${MAX_KEYS}.`);
          }
          if (currentScope.keys.has(keyVal)) {
            throw new Error(`[JCS] Duplicate JSON key detected: "${keyVal}". Block is malformed.`);
          }
          currentScope.keys.add(keyVal);
          expectedNext = 'COLON';
        } else if (expectedNext === 'VALUE') {
          expectedNext = 'ANY';
        } else {
          throw new Error(`[JCS] Unexpected string literal at position ${token.start}.`);
        }
      } else {
        expectedNext = 'ANY';
      }

      if (!rootOpened && stack.length === 0) {
        hasClosedRoot = true;
      }
    } else if (token.type === TokenType.LITERAL) {
      if (expectedNext === 'KEY' || expectedNext === 'COLON') {
        throw new Error(`[JCS] Unexpected unquoted literal or number at position ${token.start}.`);
      }
      expectedNext = 'ANY';

      if (!rootOpened && stack.length === 0) {
        hasClosedRoot = true;
      }
    }
  }

  if (stack.length !== 0) {
    throw new Error('[JCS] Unclosed JSON containers detected.');
  }
}

/**
 * Computes the deterministic SHA-256 block hash for ZTAN ledger blocks.
 * Enforces explicit Versioned Protocol Negotiation rules (Priority 6).
 */
/**
 * Verifies if a protocol version is semantically compatible with the engine version.
 * Backwards compatible for patches (e.g. 1.2.x is compatible with 1.2.0),
 * but strict major/minor match to prevent JCS/parser differential errors.
 */
export function isProtocolVersionCompatible(clientVersion: string, engineVersion = '1.2.0'): boolean {
  if (!clientVersion || typeof clientVersion !== 'string') return false;
  const cParts = clientVersion.split('.');
  const eParts = engineVersion.split('.');
  if (cParts.length !== 3 || eParts.length !== 3) {
    return false;
  }
  return cParts[0] === eParts[0] && cParts[1] === eParts[1];
}

export function computeZtanBlockHash(block: {
  protocol_version: string;
  hash_algorithm: string;
  signature_algorithm: string;
  sequence_id: number;
  timestamp: string;
  type: string;
  payload: Record<string, any>;
  operator_id: string;
  prev_hash: string;
}): string {
  // 1. Versioned Protocol Negotiation enforcement (Priority 6)
  if (!isProtocolVersionCompatible(block.protocol_version, '1.2.0')) {
    throw new Error(`[JCS] Unsupported protocol version: "${block.protocol_version}". Supported version is "1.2.0".`);
  }
  if (block.hash_algorithm !== 'SHA-256') {
    throw new Error(`[JCS] Unsupported hash algorithm: "${block.hash_algorithm}". Supported algorithm is "SHA-256".`);
  }
  if (block.signature_algorithm !== 'ECDSA-secp256r1-SHA256') {
    throw new Error(`[JCS] Unsupported signature algorithm: "${block.signature_algorithm}". Supported algorithm is "ECDSA-secp256r1-SHA256".`);
  }

  // 2. Enforce sequence ID numeric constraints
  if (block.sequence_id > 9007199254740991) {
    throw new Error('[JCS] Sequence ID exceeds JS integer safety threshold (2^53 - 1).');
  }

  // 3. Validate timestamp format: strictly YYYY-MM-DDTHH:mm:ss.sssZ
  const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  if (!timestampRegex.test(block.timestamp)) {
    throw new Error(`[JCS] Timestamp "${block.timestamp}" must strictly use millisecond precision UTC format.`);
  }

  // 4. Structure clean signing object
  const signingObject = {
    protocol_version: block.protocol_version,
    hash_algorithm: block.hash_algorithm,
    signature_algorithm: block.signature_algorithm,
    operator_id: block.operator_id,
    payload: block.payload,
    prev_hash: block.prev_hash.toLowerCase(),
    sequence_id: block.sequence_id,
    timestamp: block.timestamp,
    type: block.type
  };

  // 5. JCS serialization and hashing
  const jcsString = canonicalizeJCS(signingObject);
  return crypto.createHash('sha256').update(jcsString, 'utf8').digest('hex');
}
