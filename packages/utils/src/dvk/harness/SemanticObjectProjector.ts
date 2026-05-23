export interface ASTNode {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  value?: any;
  children?: ASTNode[] | { key: string; value: ASTNode }[];
  forensics?: any;
  keyForensics?: Record<string, any>;
}

export interface ASTComparisonResult {
  isEqual: boolean;
  mismatchPath?: string;
  details?: string;
}

export class SemanticObjectProjector {
  /**
   * Reconstructs a clean token sequence from TS snapshots.
   */
  public static extractTSTokens(snapshots: any[]): any[] {
    return snapshots
      .filter(s => s.transition_reason === 'token_processed' && s.metadata)
      .map(s => s.metadata);
  }

  /**
   * Decodes a string, handling unicode escapes and standard JSON escape sequences uniformly.
   */
  private static decodeString(str: string): string {
    try {
      return JSON.parse(`"${str}"`);
    } catch {
      return str;
    }
  }

  /**
   * Reconstructs a clean token sequence from Rust snapshots and payload.
   */
  public static extractRustTokens(snapshots: any[], payload: string): any[] {
    const rustSnaps = snapshots.filter(s => s.metadata);
    if (rustSnaps.length === 0) return [];

    // Bypass slicing to prevent final delimiter truncation desync in successful accepts
    const processedPayload = payload;

    const tokens: any[] = [];
    let i = 0;
    const n = processedPayload.length;

    while (i < n) {
      const char = processedPayload[i];

      if (/\s/.test(char)) {
        i++;
        continue;
      }

      if (char === '{') {
        tokens.push({ token_type: 'LEFT_BRACE', value: '{', start: i, end: i + 1 });
        i++;
      } else if (char === '}') {
        tokens.push({ token_type: 'RIGHT_BRACE', value: '}', start: i, end: i + 1 });
        i++;
      } else if (char === '[') {
        tokens.push({ token_type: 'LEFT_BRACKET', value: '[', start: i, end: i + 1 });
        i++;
      } else if (char === ']') {
        tokens.push({ token_type: 'RIGHT_BRACKET', value: ']', start: i, end: i + 1 });
        i++;
      } else if (char === ':') {
        tokens.push({ token_type: 'COLON', value: ':', start: i, end: i + 1 });
        i++;
      } else if (char === ',') {
        tokens.push({ token_type: 'COMMA', value: ',', start: i, end: i + 1 });
        i++;
      } else if (char === '"') {
        const start = i;
        i++; // skip quote
        let stringVal = '';
        while (i < n) {
          const c = processedPayload[i];
          if (c === '\\') {
            stringVal += '\\';
            i++;
            if (i < n) {
              stringVal += processedPayload[i];
              i++;
            }
          } else if (c === '"') {
            i++; // skip quote
            break;
          } else {
            stringVal += c;
            i++;
          }
        }
        tokens.push({
          token_type: 'STRING',
          value: stringVal,
          start,
          end: i
        });
      } else {
        // Literal
        const start = i;
        let literalVal = '';
        while (i < n && !/\s/.test(processedPayload[i]) && !/[{}[\]:,"]/.test(processedPayload[i])) {
          literalVal += processedPayload[i];
          i++;
        }
        tokens.push({
          token_type: 'LITERAL',
          value: literalVal,
          start,
          end: i
        });
      }
    }

    return tokens;
  }

  private static getGraphemeCount(str: string): number {
    if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
      try {
        const segmenter = new (Intl as any).Segmenter();
        return Array.from(segmenter.segment(str)).length;
      } catch {}
    }
    // Fallback regex for splitting graphemes (counts code points correctly including surrogate pairs)
    return [...str].length;
  }

  private static getScriptMixingDensity(str: string): number {
    if (!str) return 0;
    let latinCount = 0;
    let cyrillicCount = 0;
    let greekCount = 0;
    let otherCount = 0;

    for (const char of str) {
      if (/[\u0041-\u005A\u0061-\u007A]/.test(char)) {
        latinCount++;
      } else if (/[\u0400-\u04FF]/.test(char)) {
        cyrillicCount++;
      } else if (/[\u0370-\u03FF]/.test(char)) {
        greekCount++;
      } else if (/\w/.test(char)) {
        otherCount++;
      }
    }

    const totalLetters = latinCount + cyrillicCount + greekCount + otherCount;
    if (totalLetters === 0) return 0;

    const presentScripts = [latinCount > 0, cyrillicCount > 0, greekCount > 0, otherCount > 0].filter(Boolean).length;
    return (presentScripts - 1) / 3; // Normalized mixing metric between 0.0 and 1.0
  }

  /**
   * Scans a string for ZWJ, RTL controls, homoglyphs, and advanced Unicode artifacts (variation selectors, regional indicators, tags, combining marks, invisible separators).
   */
  public static scanUnicodeForensics(value: string): any {
    const forensics: any = {
      hasZWJ: false,
      hasRTL: false,
      hasHomoglyph: false,
      hasVariationSelector: false,
      hasRegionalIndicator: false,
      hasTagCharacters: false,
      hasCombiningMarks: false,
      hasInvisibleSeparators: false,
      scriptMixingDensity: 0,
      graphemeCount: 0,
      codePointCount: 0,
      details: []
    };

    if (typeof value !== 'string') return forensics;

    forensics.codePointCount = [...value].length;
    forensics.graphemeCount = this.getGraphemeCount(value);

    if (value.includes('\u200D')) {
      forensics.hasZWJ = true;
      forensics.details.push('Detected Zero Width Joiner (ZWJ) unicode sequence.');
    }

    const rtlChars = /[\u200E\u200F\u202A\u202B\u202C\u202D\u202E]/;
    if (rtlChars.test(value)) {
      forensics.hasRTL = true;
      forensics.details.push('Detected bidirectional / RTL text control override characters.');
    }

    const cyrillicConfusables = /[\u0430\u0435\u043e\u0440\u0441\u0443\u0445\u0456\u0455\u0410\u0412\u0415\u041a\u041c\u041d\u041e\u0420\u0421\u0422\u0425\u0406\u0405]/;
    if (cyrillicConfusables.test(value)) {
      forensics.hasHomoglyph = true;
      forensics.details.push('Detected potential homoglyph shadow confusable (Latin/Cyrillic overlap).');
    }

    // Phase 17 Advanced Unicode checks
    const variationSelectorRegex = /[\uFE00-\uFE0F]|[\u{E0100}-\u{E01EF}]/u;
    if (variationSelectorRegex.test(value)) {
      forensics.hasVariationSelector = true;
      forensics.details.push('Detected variation selectors.');
    }

    const regionalIndicatorRegex = /[\u{1F1E6}-\u{1F1FF}]{2}/u;
    if (regionalIndicatorRegex.test(value)) {
      forensics.hasRegionalIndicator = true;
      forensics.details.push('Detected regional indicator pairs (flag rendering sequence).');
    }

    const tagCharactersRegex = /[\u{E0020}-\u{E007F}]/u;
    if (tagCharactersRegex.test(value)) {
      forensics.hasTagCharacters = true;
      forensics.details.push('Detected invisible Unicode tag / semantic tag payload.');
    }

    const combiningMarksRegex = /[\u0300-\u036F]/;
    if (combiningMarksRegex.test(value)) {
      forensics.hasCombiningMarks = true;
      forensics.details.push('Detected combining diacritical marks stack.');
    }

    const invisibleSeparatorsRegex = /[\u200B\u200C\uFEFF]/;
    if (invisibleSeparatorsRegex.test(value)) {
      forensics.hasInvisibleSeparators = true;
      forensics.details.push('Detected invisible zero-width spaces/separators.');
    }

    forensics.scriptMixingDensity = this.getScriptMixingDensity(value);
    if (forensics.scriptMixingDensity > 0) {
      forensics.details.push(`Detected mixed-script content with transition density score: ${forensics.scriptMixingDensity.toFixed(2)}.`);
    }

    return forensics;
  }

  /**
   * Parses token stream recursively into a structured AST tree.
   */
  public static buildAST(
    tokens: any[],
    profile?: 'rfc8259_strict' | 'canonical_order_strict' | 'ecma262' | 'legacy_first_win' | 'duplicate_error'
  ): ASTNode {
    if (tokens.length === 0) {
      throw new Error('No tokens to build AST');
    }
    const indexRef = { index: 0 };
    const ast = this.parseValue(tokens, indexRef, profile);
    if (indexRef.index < tokens.length) {
      const trailing = tokens.slice(indexRef.index).filter(t => t.token_type !== 'COMMA');
      if (trailing.length > 0) {
        throw new Error(`Trailing tokens detected at position ${trailing[0].start}`);
      }
    }
    return ast;
  }

  private static parseValue(
    tokens: any[],
    indexRef: { index: number },
    profile?: 'rfc8259_strict' | 'canonical_order_strict' | 'ecma262' | 'legacy_first_win' | 'duplicate_error'
  ): ASTNode {
    const token = tokens[indexRef.index];
    if (!token) {
      throw new Error('Unexpected end of tokens during AST construction');
    }

    if (token.token_type === 'LEFT_BRACE') {
      indexRef.index++; // consume '{'
      const children: { key: string; value: ASTNode }[] = [];
      const keyIndexMap = new Map<string, number>();
      const keyForensics: Record<string, any> = {};

      while (indexRef.index < tokens.length && tokens[indexRef.index].token_type !== 'RIGHT_BRACE') {
        const keyToken = tokens[indexRef.index];
        if (keyToken.token_type !== 'STRING') {
          throw new Error(`Expected object key string, got ${keyToken.token_type} at position ${keyToken.start}`);
        }
        const key = this.decodeString(keyToken.value);
        indexRef.index++; // consume key

        const colon = tokens[indexRef.index];
        if (!colon || colon.token_type !== 'COLON') {
          throw new Error(`Expected colon after object key, got ${colon?.token_type || 'EOF'} at position ${keyToken.end}`);
        }
        indexRef.index++; // consume ':'

        const valNode = this.parseValue(tokens, indexRef, profile);

        // Scan key for unicode forensics
        const keyScan = this.scanUnicodeForensics(key);
        if (
          keyScan.hasZWJ ||
          keyScan.hasRTL ||
          keyScan.hasHomoglyph ||
          keyScan.hasVariationSelector ||
          keyScan.hasRegionalIndicator ||
          keyScan.hasTagCharacters ||
          keyScan.hasCombiningMarks ||
          keyScan.hasInvisibleSeparators ||
          keyScan.scriptMixingDensity > 0
        ) {
          keyForensics[key] = keyScan;
        }

        const lowerProfile = profile?.toLowerCase() || 'ecma262';

        if (keyIndexMap.has(key)) {
          if (lowerProfile === 'rfc8259_strict' || lowerProfile === 'canonical_order_strict') {
            throw new Error(`[CANONICAL_ORDER_STRICT] Duplicate key detected: "${key}"`);
          } else if (lowerProfile === 'duplicate_error') {
            throw new Error(`[DUPLICATE_ERROR] Duplicate key detected: "${key}"`);
          } else if (lowerProfile === 'legacy_first_win') {
            // Keep first, ignore subsequent keys.
          } else {
            // Default ecma262 last key wins
            const idx = keyIndexMap.get(key)!;
            children[idx] = { key, value: valNode };
          }
        } else {
          keyIndexMap.set(key, children.length);
          children.push({ key, value: valNode });
        }

        const next = tokens[indexRef.index];
        if (next && next.token_type === 'COMMA') {
          indexRef.index++; // consume ','
        }
      }

      if (indexRef.index >= tokens.length) {
        throw new Error('Unterminated object brace in token stream');
      }
      indexRef.index++; // consume '}'
      return {
        type: 'object',
        children,
        keyForensics: Object.keys(keyForensics).length > 0 ? keyForensics : undefined
      };
    }

    if (token.token_type === 'LEFT_BRACKET') {
      indexRef.index++; // consume '['
      const children: ASTNode[] = [];

      while (indexRef.index < tokens.length && tokens[indexRef.index].token_type !== 'RIGHT_BRACKET') {
        const valNode = this.parseValue(tokens, indexRef, profile);
        children.push(valNode);

        const next = tokens[indexRef.index];
        if (next && next.token_type === 'COMMA') {
          indexRef.index++; // consume ','
        }
      }

      if (indexRef.index >= tokens.length) {
        throw new Error('Unterminated array bracket in token stream');
      }
      indexRef.index++; // consume ']'
      return { type: 'array', children };
    }

    if (token.token_type === 'STRING') {
      indexRef.index++;
      const decoded = this.decodeString(token.value);
      return {
        type: 'string',
        value: decoded,
        forensics: this.scanUnicodeForensics(decoded)
      };
    }

    if (token.token_type === 'LITERAL') {
      indexRef.index++;
      const val = token.value;
      if (val === 'true') return { type: 'boolean', value: true };
      if (val === 'false') return { type: 'boolean', value: false };
      if (val === 'null') return { type: 'null', value: null };

      const num = Number(val);
      return { type: 'number', value: num };
    }

    throw new Error(`Unexpected token type ${token.token_type} at position ${token.start}`);
  }

  /**
   * Performs recursive deep structural matching of two AST trees.
   */
  public static compareASTs(
    a: ASTNode,
    b: ASTNode,
    path = '',
    profile?: 'rfc8259_strict' | 'canonical_order_strict' | 'ecma262' | 'legacy_first_win' | 'duplicate_error'
  ): ASTComparisonResult {
    if (a.type !== b.type) {
      return { isEqual: false, mismatchPath: path, details: `Type desync: TS is ${a.type}, Rust is ${b.type}` };
    }

    if (a.type === 'object') {
      const aChildren = a.children as { key: string; value: ASTNode }[] || [];
      const bChildren = b.children as { key: string; value: ASTNode }[] || [];
      if (aChildren.length !== bChildren.length) {
        return {
          isEqual: false,
          mismatchPath: path,
          details: `Object key length desync: TS has ${aChildren.length} keys, Rust has ${bChildren.length} keys`
        };
      }

      const lowerProfile = profile?.toLowerCase() || 'ecma262';
      const isStrictOrder = lowerProfile === 'rfc8259_strict' || lowerProfile === 'canonical_order_strict';

      if (isStrictOrder) {
        // Enforce strict key order and throw on desync
        for (let i = 0; i < aChildren.length; i++) {
          const aChild = aChildren[i];
          const bChild = bChildren[i];
          const normalizedAKey = aChild.key.normalize('NFC');
          const normalizedBKey = bChild.key.normalize('NFC');
          if (normalizedAKey !== normalizedBKey) {
            throw new Error(`[CANONICAL_ORDER_STRICT] Key-order mismatch detected at path "${path}": TS has "${aChild.key}", Rust has "${bChild.key}"`);
          }
          const childRes = this.compareASTs(aChild.value, bChild.value, `${path}.${aChild.key}`, profile);
          if (!childRes.isEqual) return childRes;
        }
      } else {
        // Map-based lookup for order independence in other profiles
        const bMap = new Map<string, ASTNode>();
        for (const bChild of bChildren) {
          bMap.set(bChild.key.normalize('NFC'), bChild.value);
        }
        for (const aChild of aChildren) {
          const normAKey = aChild.key.normalize('NFC');
          if (!bMap.has(normAKey)) {
            return {
              isEqual: false,
              mismatchPath: `${path}.${aChild.key}`,
              details: `Key name desync: Rust is missing key "${aChild.key}"`
            };
          }
          const bVal = bMap.get(normAKey)!;
          const childRes = this.compareASTs(aChild.value, bVal, `${path}.${aChild.key}`, profile);
          if (!childRes.isEqual) return childRes;
        }
      }
      return { isEqual: true };
    }

    if (a.type === 'array') {
      const aChildren = a.children as ASTNode[] || [];
      const bChildren = b.children as ASTNode[] || [];
      if (aChildren.length !== bChildren.length) {
        return {
          isEqual: false,
          mismatchPath: path,
          details: `Array element length desync: TS has ${aChildren.length} elements, Rust has ${bChildren.length} elements`
        };
      }
      for (let i = 0; i < aChildren.length; i++) {
        const childRes = this.compareASTs(aChildren[i], bChildren[i], `${path}[${i}]`, profile);
        if (!childRes.isEqual) return childRes;
      }
      return { isEqual: true };
    }

    if (a.type === 'string') {
      const aNorm = (a.value as string).normalize('NFC');
      const bNorm = (b.value as string).normalize('NFC');
      if (aNorm !== bNorm) {
        return {
          isEqual: false,
          mismatchPath: path,
          details: `String value desync: TS NFC="${aNorm}", Rust NFC="${bNorm}"`
        };
      }
      return { isEqual: true };
    }

    if (a.type === 'number') {
      const aNum = a.value as number;
      const bNum = b.value as number;

      if (Object.is(aNum, bNum)) {
        return { isEqual: true };
      }
      if (Number.isNaN(aNum) && Number.isNaN(bNum)) {
        return { isEqual: true };
      }
      if (Number.isNaN(aNum) || Number.isNaN(bNum)) {
        return { isEqual: false, mismatchPath: path, details: `NaN asymmetry: TS is ${aNum}, Rust is ${bNum}` };
      }
      if (Object.is(aNum, -0) || Object.is(bNum, -0)) {
        return { isEqual: false, mismatchPath: path, details: `Negative zero asymmetry: TS is ${aNum}, Rust is ${bNum}` };
      }
      if (Math.abs(aNum - bNum) > Number.EPSILON) {
        return {
          isEqual: false,
          mismatchPath: path,
          details: `Float precision desync: TS is ${aNum}, Rust is ${bNum} (delta: ${Math.abs(aNum - bNum)})`
        };
      }
      return { isEqual: true };
    }

    if (a.value !== b.value) {
      return { isEqual: false, mismatchPath: path, details: `Value desync: TS is "${a.value}", Rust is "${b.value}"` };
    }

    return { isEqual: true };
  }
}
