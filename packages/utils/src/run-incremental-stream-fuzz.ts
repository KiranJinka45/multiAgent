import { TokenType, validateDuplicateKeys } from './canonicalizer.js';
import type { Token } from './canonicalizer.js';
import { RustVirtualRuntime, GoVirtualRuntime, PythonVirtualRuntime } from './transparency/virtual-runtimes.js';


/**
 * -----------------------------------------------------------------------------
 * 1. Incremental Streaming JSON Tokenizer
 * -----------------------------------------------------------------------------
 */
export class IncrementalStreamingTokenizer {
  private buffer = '';
  private position = 0; // Cumulative character index position

  // Tokenizer parsing states
  private state: 'NORMAL' | 'STRING' | 'LITERAL' = 'NORMAL';
  
  // String Parsing Context
  private stringAcc = '';
  private stringStart = 0;
  private inEscape = false;

  // Literal Parsing Context
  private literalAcc = '';
  private literalStart = 0;

  // Emitted tokens list
  private pendingTokens: Token[] = [];

  constructor() {}

  /**
   * Pushes a chunk of string data into the tokenizer stream.
   * Processes all complete tokens and returns them.
   */
  public write(chunk: string): Token[] {
    this.buffer += chunk;
    let i = 0;
    const n = this.buffer.length;

    while (i < n) {
      const char = this.buffer[i];

      if (this.state === 'NORMAL') {
        if (/\s/.test(char)) {
          i++;
          this.position++;
          continue;
        }

        if (char === '{') {
          this.pendingTokens.push({ type: TokenType.LEFT_BRACE, value: '{', start: this.position, end: this.position + 1 });
          i++;
          this.position++;
        } else if (char === '}') {
          this.pendingTokens.push({ type: TokenType.RIGHT_BRACE, value: '}', start: this.position, end: this.position + 1 });
          i++;
          this.position++;
        } else if (char === '[') {
          this.pendingTokens.push({ type: TokenType.LEFT_BRACKET, value: '[', start: this.position, end: this.position + 1 });
          i++;
          this.position++;
        } else if (char === ']') {
          this.pendingTokens.push({ type: TokenType.RIGHT_BRACKET, value: ']', start: this.position, end: this.position + 1 });
          i++;
          this.position++;
        } else if (char === ':') {
          this.pendingTokens.push({ type: TokenType.COLON, value: ':', start: this.position, end: this.position + 1 });
          i++;
          this.position++;
        } else if (char === ',') {
          this.pendingTokens.push({ type: TokenType.COMMA, value: ',', start: this.position, end: this.position + 1 });
          i++;
          this.position++;
        } else if (char === '"') {
          this.state = 'STRING';
          this.stringAcc = '';
          this.stringStart = this.position;
          this.inEscape = false;
          i++;
          this.position++;
        } else {
          this.state = 'LITERAL';
          this.literalAcc = char;
          this.literalStart = this.position;
          i++;
          this.position++;
        }
      } else if (this.state === 'STRING') {
        if (this.inEscape) {
          this.stringAcc += '\\' + char;
          this.inEscape = false;
          i++;
          this.position++;
        } else if (char === '\\') {
          this.inEscape = true;
          i++;
          this.position++;
        } else if (char === '"') {
          // Reject Lone Surrogates
          if (/(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(this.stringAcc)) {
            throw new Error('[JCS] Lone surrogates are strictly forbidden to prevent UTF-8 encoding anomalies.');
          }
          if (this.stringAcc.length > 65536) { // MAX_STRING
            throw new Error('[JCS] Parsed string token exceeds safety limit of 65536 characters.');
          }

          this.pendingTokens.push({
            type: TokenType.STRING,
            value: this.stringAcc,
            start: this.stringStart,
            end: this.position + 1
          });
          this.state = 'NORMAL';
          i++;
          this.position++;
        } else {
          this.stringAcc += char;
          i++;
          this.position++;
        }
      } else if (this.state === 'LITERAL') {
        if (/\s/.test(char) || /[{}[\],:]/.test(char)) {
          this.validateAndEmitLiteral();
          this.state = 'NORMAL';
        } else {
          this.literalAcc += char;
          i++;
          this.position++;
        }
      }
    }

    // Keep unprocessed remainder in buffer
    this.buffer = this.buffer.substring(i);
    return this.pendingTokens.splice(0, this.pendingTokens.length);
  }

  /**
   * Flushes and processes any remaining literal token at the end of the input stream.
   */
  public end(): Token[] {
    if (this.state === 'STRING') {
      throw new Error('[JCS] Unterminated string literal detected at end of stream.');
    }
    if (this.state === 'LITERAL') {
      this.validateAndEmitLiteral();
      this.state = 'NORMAL';
    }
    if (this.buffer.trim().length > 0) {
      throw new Error(`[JCS] Unexpected trailing characters at end of stream: "${this.buffer}".`);
    }
    return this.pendingTokens.splice(0, this.pendingTokens.length);
  }

  private validateAndEmitLiteral() {
    if (/[a-zA-Z]/.test(this.literalAcc)) {
      const words = this.literalAcc.match(/[a-zA-Z]+/g) || [];
      for (const word of words) {
        if (word !== 'true' && word !== 'false' && word !== 'null' && word !== 'e' && word !== 'E') {
          throw new Error(`[JCS] Invalid unquoted literal or identifier detected: "${word}".`);
        }
      }
    }

    // Enforce strict numeric grammar constraints for any numeric-like literal
    if (/^[-0-9.eE+]/.test(this.literalAcc)) {
      if (this.literalAcc.length > 100) {
        throw new Error('[JCS] Numeric literal length exceeds safety limit of 100 characters.');
      }
      
      // Strict JSON Number Syntax Regex (RFC 8259)
      const jsonNumberRegex = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
      if (!jsonNumberRegex.test(this.literalAcc)) {
        throw new Error(`[JCS] Malformed numeric literal detected: "${this.literalAcc}".`);
      }

      // Canonical constraint: Prohibit negative zero
      if (this.literalAcc === '-0') {
        throw new Error('[JCS] Negative zero "-0" is strictly prohibited under canonicalization rules.');
      }

      // Exponent magnitude verification
      const exponentMatch = this.literalAcc.match(/[eE][+-]?(\d+)/);
      if (exponentMatch && parseInt(exponentMatch[1], 10) > 308) {
        throw new Error('[JCS] Numeric exponent magnitude exceeds 308, risking float overflow/DoS.');
      }
    }

    this.pendingTokens.push({
      type: TokenType.LITERAL,
      value: this.literalAcc,
      start: this.literalStart,
      end: this.literalStart + this.literalAcc.length
    });
  }
}

/**
 * -----------------------------------------------------------------------------
 * 2. Incremental Streaming JSON Duplicate Key & Structural Validator
 * -----------------------------------------------------------------------------
 */
export class IncrementalStreamingValidator {
  private stack: { type: 'OBJECT' | 'ARRAY'; keys: Set<string> }[] = [];
  private expectedNext: 'ANY' | 'KEY' | 'COLON' | 'VALUE' = 'ANY';
  private hasClosedRoot = false;
  private rootOpened = false;

  constructor() {}

  public processTokens(tokens: Token[]) {
    for (const token of tokens) {
      if (this.hasClosedRoot) {
        throw new Error(`[JCS] Unexpected trailing token at position ${token.start}.`);
      }

      if (token.type === TokenType.LEFT_BRACE || token.type === TokenType.LEFT_BRACKET) {
        this.rootOpened = true;
      }

      if (this.stack.length > 64) { // MAX_DEPTH
        throw new Error(`[JCS] Parser nesting depth limit of 64 exceeded.`);
      }

      const currentScope = this.stack[this.stack.length - 1];

      if (token.type === TokenType.LEFT_BRACE) {
        if (this.expectedNext === 'KEY' || this.expectedNext === 'COLON') {
          throw new Error(`[JCS] Unexpected object token '{' at position ${token.start}.`);
        }
        this.stack.push({ type: 'OBJECT', keys: new Set() });
        this.expectedNext = 'KEY';
      } else if (token.type === TokenType.RIGHT_BRACE) {
        if (!currentScope || currentScope.type !== 'OBJECT') {
          throw new Error(`[JCS] Mismatched closing brace '}' at position ${token.start}.`);
        }
        if (this.expectedNext === 'COLON' || this.expectedNext === 'VALUE') {
          throw new Error(`[JCS] Unexpected closing brace '}' at position ${token.start}.`);
        }
        this.stack.pop();
        this.expectedNext = 'ANY';

        if (this.rootOpened && this.stack.length === 0) {
          this.hasClosedRoot = true;
        }
      } else if (token.type === TokenType.LEFT_BRACKET) {
        if (this.expectedNext === 'KEY' || this.expectedNext === 'COLON') {
          throw new Error(`[JCS] Unexpected array token '[' at position ${token.start}.`);
        }
        this.stack.push({ type: 'ARRAY', keys: new Set() });
        this.expectedNext = 'ANY';
      } else if (token.type === TokenType.RIGHT_BRACKET) {
        if (!currentScope || currentScope.type !== 'ARRAY') {
          throw new Error(`[JCS] Mismatched closing bracket ']' at position ${token.start}.`);
        }
        this.stack.pop();
        this.expectedNext = 'ANY';

        if (this.rootOpened && this.stack.length === 0) {
          this.hasClosedRoot = true;
        }
      } else if (token.type === TokenType.COLON) {
        if (this.expectedNext !== 'COLON') {
          throw new Error(`[JCS] Unexpected colon ':' at position ${token.start}.`);
        }
        this.expectedNext = 'VALUE';
      } else if (token.type === TokenType.COMMA) {
        if (this.expectedNext !== 'ANY') {
          throw new Error(`[JCS] Unexpected comma ',' at position ${token.start}.`);
        }
        if (currentScope && currentScope.type === 'OBJECT') {
          this.expectedNext = 'KEY';
        } else {
          this.expectedNext = 'ANY';
        }
      } else if (token.type === TokenType.STRING) {
        if (currentScope && currentScope.type === 'OBJECT') {
          if (this.expectedNext === 'KEY' || this.expectedNext === 'ANY') {
            const keyVal = token.value;
            if (currentScope.keys.size >= 10000) { // MAX_KEYS
              throw new Error(`[JCS] Lexical keys count in scope exceeds safe limit of 10000.`);
            }
            if (currentScope.keys.has(keyVal)) {
              throw new Error(`[JCS] Duplicate JSON key detected: "${keyVal}". Block is malformed.`);
            }
            currentScope.keys.add(keyVal);
            this.expectedNext = 'COLON';
          } else if (this.expectedNext === 'VALUE') {
            this.expectedNext = 'ANY';
          } else {
            throw new Error(`[JCS] Unexpected string literal at position ${token.start}.`);
          }
        } else {
          this.expectedNext = 'ANY';
        }

        if (!this.rootOpened && this.stack.length === 0) {
          this.hasClosedRoot = true;
        }
      } else if (token.type === TokenType.LITERAL) {
        if (this.expectedNext === 'KEY' || this.expectedNext === 'COLON') {
          throw new Error(`[JCS] Unexpected unquoted literal or number at position ${token.start}.`);
        }
        this.expectedNext = 'ANY';

        if (!this.rootOpened && this.stack.length === 0) {
          this.hasClosedRoot = true;
        }
      }
    }
  }

  public finalize() {
    if (this.stack.length !== 0) {
      throw new Error('[JCS] Unclosed JSON containers detected at EOF.');
    }
  }
}

/**
 * -----------------------------------------------------------------------------
 * 3. Streaming Fragmentation Adversarial Fuzzing Campaign
 * -----------------------------------------------------------------------------
 */
const fuzzVectors = [
  // 1. Valid Cases
  { id: 'simple_object', raw: '{"rate":1e5,"success":true,"tag":null}' },
  { id: 'nested_structure', raw: '{"data":{"node":[1,2,3]},"id":100}' },
  { id: 'empty_object', raw: '{}' },
  { id: 'composed_unicode', raw: '{"name":"ä","surrogate":"\\uD83D\\uDC4D"}' },
  
  // 2. Escape Boundary Splitting Cases
  { id: 'split_escape_quote', raw: '{"text":"hello \\"world\\""}' },
  { id: 'split_escape_unicode', raw: '{"text":"\\u2705 emoji \\uD83D\\uDC4D"}' },
  
  // 3. Lone Surrogate Rejections (Should Fail)
  { id: 'lone_surrogate_high', raw: '{"text":"\\ud83d"}' },
  { id: 'lone_surrogate_low', raw: '{"text":"\\ude00"}' },

  // 4. Duplicate Keys (Should Fail)
  { id: 'duplicate_key_flat', raw: '{"id":1,"name":"Alice","id":2}' },
  { id: 'duplicate_key_nested', raw: '{"data":{"tag":"A","tag":"B"}}' },

  // 5. Unquoted Literals (Should Fail)
  { id: 'unquoted_infinity', raw: '{"rate":Infinity}' },
  { id: 'unquoted_nan', raw: '{"rate":NaN}' },
  { id: 'unquoted_undefined', raw: '{"rate":undefined}' },
  { id: 'unquoted_invalid_identifier', raw: '{"rate":foo}' },

  // 6. Hardened JSON Numeric Edge Cases (Should Fail)
  { id: 'number_leading_zero', raw: '{"val":01}' },
  { id: 'number_trailing_decimal', raw: '{"val":1.}' },
  { id: 'number_leading_decimal', raw: '{"val":.1}' },
  { id: 'number_incomplete_exponent', raw: '{"val":1e}' },
  { id: 'number_incomplete_exponent_sign', raw: '{"val":1e+}' },
  { id: 'number_minus_zero', raw: '{"val":-0}' },
  { id: 'number_huge_exponent', raw: '{"val":1e9999}' },
  { id: 'number_ultra_long_decimal', raw: '{"val":1.0000000000000000000000000000000000000000000000000000000000000001}' },

  // 7. Parsing Nesting Overflows (Should Fail)
  { id: 'nesting_overflow', raw: '[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]' }
];

export function runFuzzCampaign() {
  console.log('===========================================================');
  console.log('    ZTAN Incremental Stream Fragmentation Fuzzing Campaign');
  console.log('===========================================================');

  const rustRuntime = new RustVirtualRuntime();
  const goRuntime = new GoVirtualRuntime();
  const pythonRuntime = new PythonVirtualRuntime();

  let passedTests = 0;
  let failedTests = 0;

  for (const vector of fuzzVectors) {
    // 1. Establish ground truth reference outcome across TS, Go, Rust, and Python Virtual Runtimes
    let referenceError: string | null = null;
    try {
      validateDuplicateKeys(vector.raw);
    } catch (e: any) {
      referenceError = e.message;
    }

    let rustError: string | null = null;
    try {
      rustRuntime.validateDuplicateKeys(vector.raw);
    } catch (e: any) {
      rustError = e.message;
    }

    let goError: string | null = null;
    try {
      goRuntime.validateDuplicateKeys(vector.raw);
    } catch (e: any) {
      goError = e.message;
    }

    let pythonError: string | null = null;
    try {
      pythonRuntime.validateDuplicateKeys(vector.raw);
    } catch (e: any) {
      pythonError = e.message;
    }

    // Verify static cross-runtime parser convergence first
    const tsPass = referenceError === null;
    const rustPass = rustError === null;
    const goPass = goError === null;
    const pythonPass = pythonError === null;

    if (tsPass !== rustPass || tsPass !== goPass || tsPass !== pythonPass) {
      console.error(`[FAIL] Cross-Runtime Reference Mismatch on vector [${vector.id}]!`);
      console.error(`  Node/TS Pass: ${tsPass} | Rust Pass: ${rustPass} | Go Pass: ${goPass} | Python Pass: ${pythonPass}`);
      process.exit(1);
    }

    // 2. Perform streaming fuzz campaign with randomized chunk sizes
    const chunkSizes = [1, 2, 5, 13];
    let suitePassed = true;

    for (const size of chunkSizes) {
      const tokenizer = new IncrementalStreamingTokenizer();
      const validator = new IncrementalStreamingValidator();
      let streamError: string | null = null;

      try {
        // Chunk fragmentation simulator
        let startIdx = 0;
        while (startIdx < vector.raw.length) {
          const chunk = vector.raw.substring(startIdx, startIdx + size);
          const tokens = tokenizer.write(chunk);
          validator.processTokens(tokens);
          startIdx += size;
        }
        // EOF Flush
        const finalTokens = tokenizer.end();
        validator.processTokens(finalTokens);
        validator.finalize();
      } catch (e: any) {
        streamError = e.message;
      }

      // Verify outcome parity
      const streamPass = streamError === null;

      if (tsPass !== streamPass) {
        console.error(`[FAIL] Vector [${vector.id}] Diverged at chunk size ${size}!`);
        console.error(`  Reference Outcome: ${tsPass ? 'ACCEPTED' : 'REJECTED: ' + referenceError}`);
        console.error(`  Streaming Outcome: ${streamPass ? 'ACCEPTED' : 'REJECTED: ' + streamError}`);
        suitePassed = false;
      }
    }

    if (suitePassed) {
      console.log(`[PASS] Vector [${vector.id}]: The virtualization harness demonstrated convergent behavior with the currently modeled runtime semantics under the tested fragmentation scenarios.`);
      passedTests++;
    } else {
      failedTests++;
    }
  }

  console.log('===========================================================');
  console.log(`Campaign Finished: ${passedTests} passed, ${failedTests} failed.`);
  console.log('===========================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

// Execute fuzzer only when run directly
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('run-incremental-stream-fuzz.ts') || 
  process.argv[1].endsWith('run-incremental-stream-fuzz.js')
);
if (isDirectRun) {
  runFuzzCampaign();
}
