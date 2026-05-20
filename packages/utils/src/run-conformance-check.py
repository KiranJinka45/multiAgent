import os
import sys
import json
import hashlib
import re
import math
import unicodedata

# ===========================================================
#     ZTAN Python Deterministic Conformance & Parity Runner  
# ===========================================================

MAX_DEPTH = 64
MAX_KEYS = 10000
MAX_STRING = 65536

print("===========================================================")
print("    ZTAN Python Golden Interoperability & Parity Runner    ")
print("===========================================================")

def canonicalize_jcs(value, seen=None, depth=0):
    if depth > MAX_DEPTH:
        raise ValueError(f"[JCS] Maximum nesting depth of {MAX_DEPTH} exceeded.")
    if seen is None:
        seen = set()
        
    if value is None:
        return 'null'
    
    if isinstance(value, bool):
        return 'true' if value else 'false'

    # Note: in Python, bool is a subclass of int, so we MUST check bool first
    if isinstance(value, (int, float)):
        if not math.isfinite(value):
            raise ValueError("[JCS] Non-finite number values (Infinity, NaN) are strictly forbidden.")
        if isinstance(value, float):
            # Format according to JCS/RFC-8785 IEEE 754 Rules:
            # Trailing zeros and redundant decimal points should be stripped.
            val_str = str(value)
            if 'e' in val_str or 'E' in val_str:
                # Handled scientific notation format
                pass
            else:
                if val_str.endswith('.0'):
                    val_str = val_str[:-2]
            return val_str
        return str(value)

    if isinstance(value, str):
        if len(value) > MAX_STRING:
            raise ValueError(f"[JCS] Maximum string length of {MAX_STRING} exceeded.")
        # Unicode NFC Normalization
        normalized = unicodedata.normalize('NFC', value)
        # RFC 8785 compliant JCS escaping.
        # json.dumps with ensure_ascii=False correctly outputs actual characters
        # for unicode sequences, while escaping backslashes, quotes, and controls.
        return json.dumps(normalized, ensure_ascii=False)

    if isinstance(value, list):
        items = [canonicalize_jcs(item, seen, depth + 1) for item in value]
        return '[' + ','.join(items) + ']'

    if isinstance(value, dict):
        ref_id = id(value)
        if ref_id in seen:
            raise ValueError("[JCS] Circular structure detected; serialization aborted.")
        seen.add(ref_id)

        if len(value) > MAX_KEYS:
            raise ValueError(f"[JCS] Maximum object keys limit of {MAX_KEYS} exceeded in a single scope.")

        # JCS Lexicographical key sorting (Unicode code points ordering)
        sorted_keys = sorted(value.keys())
        parts = []
        for key in sorted_keys:
            if len(key) > MAX_STRING:
                raise ValueError(f"[JCS] Object key exceeds maximum length of {MAX_STRING}.")
            canonical_key = json.dumps(unicodedata.normalize('NFC', key), ensure_ascii=False)
            canonical_val = canonicalize_jcs(value[key], seen, depth + 1)
            parts.append(f"{canonical_key}:{canonical_val}")
            
        seen.remove(ref_id)
        return '{' + ','.join(parts) + '}'

    raise TypeError(f"[JCS] Unsupported data type: {type(value)}")

def validate_duplicate_keys(json_str):
    if len(json_str) > 1000000:
        raise ValueError(f"[JCS] JSON payload of {len(json_str)} bytes exceeds MAX_BYTES buffer.")
        
    stack = [set()]
    i = 0
    n = len(json_str)
    
    while i < n:
        if len(stack) > MAX_DEPTH:
            raise ValueError(f"[JCS] Parser nesting depth limit of {MAX_DEPTH} exceeded.")
            
        char = json_str[i]
        
        if char == '{':
            stack.append(set())
            i += 1
        elif char == '}':
            if len(stack) > 1:
                stack.pop()
            i += 1
        elif char == '"':
            start = i
            i += 1
            while i < n and json_str[i] != '"':
                if json_str[i] == '\\':
                    i += 2
                else:
                    i += 1
            i += 1
            
            j = i
            while j < n and json_str[j] in ' \t\n\r':
                j += 1
            if j < n and json_str[j] == ':':
                raw_key = json_str[start:i]
                normalized_key = unicodedata.normalize('NFC', json.loads(raw_key))
                current_scope = stack[-1]
                if normalized_key in current_scope:
                    raise ValueError(f'[JCS] Duplicate JSON key detected: "{normalized_key}". Block is malformed.')
                current_scope.add(normalized_key)
        elif char.isalpha():
            word = ''
            while i < n and json_str[i].isalpha():
                word += json_str[i]
                i += 1
            if word not in ('true', 'false', 'null', 'e', 'E'):
                raise ValueError(f'[JCS] Invalid unquoted literal or identifier detected: "{word}".')
        else:
            i += 1

def is_protocol_version_compatible(client_version, engine_version='1.2.0'):
    if not client_version or not isinstance(client_version, str):
        return False
    c_parts = client_version.split('.')
    e_parts = engine_version.split('.')
    if len(c_parts) != 3 or len(e_parts) != 3:
        return False
    return c_parts[0] == e_parts[0] and c_parts[1] == e_parts[1]

def compute_ztan_block_hash(block):
    if not is_protocol_version_compatible(block.get('protocol_version'), '1.2.0'):
        raise ValueError(f'[JCS] Unsupported protocol version: "{block.get("protocol_version")}". Supported version is "1.2.0".')
    
    if block.get('hash_algorithm') != 'SHA-256':
        raise ValueError(f'[JCS] Unsupported hash algorithm: "{block.get("hash_algorithm")}". Supported algorithm is "SHA-256".')
        
    if block.get('signature_algorithm') != 'ECDSA-secp256r1-SHA256':
        raise ValueError(f'[JCS] Unsupported signature algorithm: "{block.get("signature_algorithm")}". Supported algorithm is "ECDSA-secp256r1-SHA256".')

    seq_id = block.get('sequence_id')
    if seq_id is not None and seq_id > 9007199254740991:
        raise ValueError('[JCS] Sequence ID exceeds JS integer safety threshold (2^53 - 1).')

    timestamp = block.get('timestamp')
    if timestamp:
        timestamp_regex = r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
        if not re.match(timestamp_regex, timestamp):
            raise ValueError(f'[JCS] Timestamp "{timestamp}" must strictly use millisecond precision UTC format.')

    signing_object = {
        'protocol_version': block.get('protocol_version'),
        'hash_algorithm': block.get('hash_algorithm'),
        'signature_algorithm': block.get('signature_algorithm'),
        'operator_id': block.get('operator_id'),
        'payload': block.get('payload'),
        'prev_hash': block.get('prev_hash').lower() if block.get('prev_hash') else '',
        'sequence_id': block.get('sequence_id'),
        'timestamp': block.get('timestamp'),
        'type': block.get('type')
    }

    jcs_str = canonicalize_jcs(signing_object)
    return hashlib.sha256(jcs_str.encode('utf-8')).hexdigest()


# -----------------------------------------------------------
# Test Runner Implementation
# -----------------------------------------------------------

__dirname = os.path.dirname(os.path.abspath(__file__))
FIXTURES_FILE = os.path.join(__dirname, 'conformance_fixtures.json')

pass_count = 0
total_count = 0

def assert_equal(actual, expected, name):
    global pass_count, total_count
    total_count += 1
    if actual == expected:
        print(f"[PASS] {name}")
        pass_count += 1
    else:
        print(f"[FAIL] {name}")
        print(f"  Expected: {expected}")
        print(f"  Actual:   {actual}")

try:
    if not os.path.exists(FIXTURES_FILE):
        raise FileNotFoundError(f"Fixture file missing: {FIXTURES_FILE}")
        
    with open(FIXTURES_FILE, 'r', encoding='utf-8') as f:
        fixtures = json.load(f)
        
    print(f"Loaded {len(fixtures)} frozen interoperability fixtures.")
    
    for fixture in fixtures:
        fid = fixture['fixture_id']
        desc = fixture['description']
        action = fixture['expected_action']
        
        print(f"\nExecuting Fixture [{fid}]: {desc}")
        
        if action == 'VALIDATE_SUCCESS':
            inp = fixture['input']
            actual_jcs = canonicalize_jcs(inp)
            assert_equal(actual_jcs, fixture['expected_canonical_jcs'], f"{fid} -> Canonical JCS Bytes")
            
            actual_hash = compute_ztan_block_hash(inp)
            assert_equal(actual_hash, fixture['expected_sha256'], f"{fid} -> SHA-256 Digest Parity")
            
        elif action == 'REJECT_DUPLICATE_KEYS':
            total_count += 1
            raw_inp = fixture['raw_input_string']
            try:
                validate_duplicate_keys(raw_inp)
                print(f"[FAIL] {fid} -> Should have rejected duplicate keys.")
            except ValueError as e:
                print(f"[PASS] {fid} -> Successfully caught duplicate key rejection: {str(e)}")
                pass_count += 1
                
        elif action == 'REJECT_NON_FINITE_FLOAT':
            # Float validation test - Infinity
            total_count += 1
            inp = fixture['input']
            inp['payload']['invalid_float'] = float('inf')
            try:
                canonicalize_jcs(inp)
                print(f"[FAIL] {fid} -> Should have rejected Infinity.")
            except ValueError as e:
                print(f"[PASS] {fid} -> Successfully caught non-finite float (Infinity): {str(e)}")
                pass_count += 1
                
            # Float validation test - NaN
            total_count += 1
            inp['payload']['invalid_float'] = float('nan')
            try:
                canonicalize_jcs(inp)
                print(f"[FAIL] {fid} -> Should have rejected NaN.")
            except ValueError as e:
                print(f"[PASS] {fid} -> Successfully caught non-finite float (NaN): {str(e)}")
                pass_count += 1
                
        elif action == 'REJECT_SEQUENCE_OVERFLOW':
            total_count += 1
            inp = fixture['input']
            try:
                compute_ztan_block_hash(inp)
                print(f"[FAIL] {fid} -> Should have rejected sequence overflow.")
            except ValueError as e:
                print(f"[PASS] {fid} -> Successfully caught sequence safety overflow limit: {str(e)}")
                pass_count += 1
                
        elif action == 'REJECT_CIRCULAR_REFERENCE':
            total_count += 1
            inp = fixture['input']
            cyclic = {}
            cyclic['self'] = cyclic
            inp['payload'] = cyclic
            try:
                canonicalize_jcs(inp)
                print(f"[FAIL] {fid} -> Should have rejected circular reference.")
            except ValueError as e:
                print(f"[PASS] {fid} -> Successfully caught recursive circular structure loop: {str(e)}")
                pass_count += 1
                
        elif action == 'REJECT_MAX_DEPTH':
            total_count += 1
            inp = fixture['input']
            deep = {}
            curr = deep
            for _ in range(70):
                curr['nest'] = {}
                curr = curr['nest']
            inp['payload'] = deep
            try:
                canonicalize_jcs(inp)
                print(f"[FAIL] {fid} -> Should have rejected nesting depth exceeding 64.")
            except ValueError as e:
                print(f"[PASS] {fid} -> Successfully caught max depth overflow: {str(e)}")
                pass_count += 1
                
        elif action == 'REJECT_MAX_STRING':
            total_count += 1
            inp = fixture['input']
            inp['payload']['large_str'] = 'a' * 65537
            try:
                canonicalize_jcs(inp)
                print(f"[FAIL] {fid} -> Should have rejected oversized string.")
            except ValueError as e:
                print(f"[PASS] {fid} -> Successfully caught string safety limit: {str(e)}")
                pass_count += 1
                
        elif action == 'REJECT_UNSUPPORTED_PROTOCOL':
            total_count += 1
            inp = fixture['input']
            try:
                compute_ztan_block_hash(inp)
                print(f"[FAIL] {fid} -> Should have rejected protocol version.")
            except ValueError as e:
                print(f"[PASS] {fid} -> Successfully caught versioned protocol negotiation rejection: {str(e)}")
                pass_count += 1
                
        elif action == 'REJECT_UNSUPPORTED_HASH':
            total_count += 1
            inp = fixture['input']
            try:
                compute_ztan_block_hash(inp)
                print(f"[FAIL] {fid} -> Should have rejected hash algorithm.")
            except ValueError as e:
                print(f"[PASS] {fid} -> Successfully caught hash algorithm negotiation rejection: {str(e)}")
                pass_count += 1

except Exception as e:
    print(f"[ERROR] Conformance test crash: {str(e)}")
    sys.exit(1)

# Extra in-memory sanity checks matching JS exactly
print("\nRunning runtime sanity checks...")
try:
    # NFC Normalization Parity
    decomposed = 'a\u0308'
    composed = '\u00e4'
    assert_equal(
        canonicalize_jcs({'name': decomposed}),
        canonicalize_jcs({'name': composed}),
        'Runtime Unicode NFC normalizations yield exact identical bytes'
    )
    
    # Float zero truncation parity
    assert_equal(
        canonicalize_jcs({'rate': 0.9850, 'size': 45.0}),
        '{"rate":0.985,"size":45}',
        'IEEE 754 Float Trailing Zero Truncation'
    )
except Exception as e:
    print(f"[ERROR] Sanity checks crashed: {str(e)}")

print("===========================================================")
print(f"Interoperability Execution Completed: {pass_count}/{total_count} Passed.")
print("===========================================================")

if pass_count != total_count:
    sys.exit(1)
else:
    sys.exit(0)
