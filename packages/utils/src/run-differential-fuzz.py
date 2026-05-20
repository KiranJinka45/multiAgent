# -*- coding: utf-8 -*-
"""
ZTAN Cross-Runtime Differential Fuzzing Bridge (Python)
Accepts JSON blocks or raw strings via stdin, runs duplicate key detection and 
JCS canonicalization, and returns deterministic outcome markers.
"""

import sys
import json
import hashlib
import unicodedata
import re
import math
import io

# Force standard streams to use strict UTF-8 encoding across all OS architectures
sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

MAX_DEPTH = 64
MAX_BYTES = 1_000_000
MAX_KEYS = 10_000
MAX_STRING = 65_536

def has_lone_surrogate(val):
    if not isinstance(val, str):
        return False
    return any(55296 <= ord(c) <= 57343 for c in val)

def validate_duplicate_keys(json_str):
    if len(json_str) > MAX_BYTES:
        raise ValueError(f'[JCS] JSON payload of {len(json_str)} bytes exceeds MAX_BYTES buffer of {MAX_BYTES}.')

    stack = [set()]
    i = 0
    while i < len(json_str):
        if len(stack) > MAX_DEPTH:
            raise ValueError(f'[JCS] Parser nesting depth limit of {MAX_DEPTH} exceeded.')

        char = json_str[i]
        if char == '{':
            stack.append(set())
            i += 1
        elif char == '}':
            if len(stack) > 1:
                stack.pop()
            i += 1
        elif char == '"':
            key_val = ''
            i += 1
            while i < len(json_str) and json_str[i] != '"':
                if json_str[i] == '\\':
                    key_val += json_str[i] + (json_str[i + 1] if i + 1 < len(json_str) else '')
                    i += 2
                else:
                    key_val += json_str[i]
                    i += 1

                if len(key_val) > MAX_STRING:
                    raise ValueError(f'[JCS] Parsed string token exceeds safety limit of {MAX_STRING} characters.')
            i += 1
            if has_lone_surrogate(key_val):
                raise ValueError('[JCS] Lone surrogates are strictly forbidden to prevent UTF-8 encoding anomalies.')

            next_idx = i
            while next_idx < len(json_str) and json_str[next_idx].isspace():
                next_idx += 1

            if next_idx < len(json_str) and json_str[next_idx] == ':':
                current_set = stack[-1]
                if len(current_set) >= MAX_KEYS:
                    raise ValueError(f'[JCS] Lexical keys count in scope exceeds safe limit of {MAX_KEYS}.')
                if key_val in current_set:
                    raise ValueError(f'[JCS] Duplicate JSON key detected: "{key_val}". Block is malformed.')
                current_set.add(key_val)
                i = next_idx + 1
            else:
                i = next_idx
        elif char.isalpha():
            word = ''
            while i < len(json_str) and json_str[i].isalpha():
                word += json_str[i]
                i += 1
            if word not in ('true', 'false', 'null', 'e', 'E'):
                raise ValueError(f'[JCS] Invalid unquoted literal or identifier detected: "{word}".')
        else:
            i += 1

def canonicalize_jcs(value, seen_objects=None, depth=0):
    if seen_objects is None:
        seen_objects = set()

    if depth > MAX_DEPTH:
        raise ValueError(f'[JCS] Maximum nesting depth of {MAX_DEPTH} exceeded.')

    if value is None:
        return 'null'

    if isinstance(value, str):
        if len(value) > MAX_STRING:
            raise ValueError(f'[JCS] Maximum string length of {MAX_STRING} exceeded.')
        if has_lone_surrogate(value):
            raise ValueError('[JCS] Lone surrogates are strictly forbidden to prevent UTF-8 encoding anomalies.')
        normalized = unicodedata.normalize('NFC', value)
        # Match Javascript's JSON.stringify escaping
        escaped = json.dumps(normalized, ensure_ascii=False)
        if len(escaped) > MAX_STRING * 2:
            raise ValueError('[JCS] Escaped string value exceeds maximum serialization safety limits.')
        return escaped

    # Check for boolean first since isinstance(True, int) is True in Python
    if isinstance(value, bool):
        return 'true' if value else 'false'

    if isinstance(value, (int, float)):
        if not math.isfinite(value):
            raise ValueError('[JCS] Non-finite number values (Infinity, NaN) are strictly forbidden.')
        
        # Format matching JCS specifications
        val_str = str(value)
        if val_str.endswith('.0'):
            val_str = val_str[:-2]
        # Match scientific notation boundary format
        if 'e' in val_str or 'E' in val_str:
            # Let JSON serialize standard format
            val_str = json.dumps(value)
        return val_str

    if isinstance(value, list):
        items = [canonicalize_jcs(item, seen_objects, depth + 1) for item in value]
        result = '[' + ','.join(items) + ']'
        if len(result) > MAX_BYTES:
            raise ValueError(f'[JCS] Serialized array output exceeds maximum byte limit of {MAX_BYTES}.')
        return result

    if isinstance(value, dict):
        obj_id = id(value)
        if obj_id in seen_objects:
            raise ValueError('[JCS] Circular structure detected; serialization aborted.')
        seen_objects.add(obj_id)

        sorted_keys = sorted(value.keys())
        if len(sorted_keys) > MAX_KEYS:
            raise ValueError(f'[JCS] Maximum object keys limit of {MAX_KEYS} exceeded in a single scope.')

        parts = []
        for key in sorted_keys:
            if len(key) > MAX_STRING:
                raise ValueError(f'[JCS] Object key exceeds maximum length of {MAX_STRING}.')
            if has_lone_surrogate(key):
                raise ValueError('[JCS] Lone surrogates are strictly forbidden to prevent UTF-8 encoding anomalies.')
            canonical_key = json.dumps(unicodedata.normalize('NFC', key), ensure_ascii=False)
            canonical_val = canonicalize_jcs(value[key], seen_objects, depth + 1)
            parts.append(f'{canonical_key}:{canonical_val}')

        seen_objects.remove(obj_id)
        result = '{' + ','.join(parts) + '}'
        if len(result) > MAX_BYTES:
            raise ValueError(f'[JCS] Serialized object output exceeds maximum byte limit of {MAX_BYTES}.')
        return result

    raise ValueError(f'[JCS] Unsupported data type: {type(value)}')

def decode_placeholders(val):
    if val == 'INFINITY_PLACEHOLDER':
        return float('inf')
    if val == 'NEG_INFINITY_PLACEHOLDER':
        return float('-inf')
    if val == 'NAN_PLACEHOLDER':
        return float('nan')
    if isinstance(val, dict):
        return {k: decode_placeholders(v) for k, v in val.items()}
    if isinstance(val, list):
        return [decode_placeholders(v) for v in val]
    return val

def main():
    try:
        raw_input = sys.stdin.read()
        envelope = json.loads(raw_input)
        action = envelope.get('action')
        payload = decode_placeholders(envelope.get('payload'))

        if action == 'validate_duplicate_keys':
            validate_duplicate_keys(payload)
            print("OK")
            sys.exit(0)
        elif action == 'canonicalize_jcs':
            jcs_str = canonicalize_jcs(payload)
            print(f"OK:{jcs_str}")
            sys.exit(0)
        else:
            print(f"ERROR: Unknown action {action}")
            sys.exit(2)
    except Exception as e:
        print(f"ERROR:{str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()
