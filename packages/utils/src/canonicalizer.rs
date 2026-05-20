use std::collections::HashSet;
use regex::Regex;

// Strict operational boundaries matching ZTAN specifications
const MAX_DEPTH: usize = 64;
const MAX_BYTES: usize = 1_000_000;
const MAX_KEYS: usize = 10_000;
const MAX_STRING: usize = 65_536;
const MAX_NUM_LEN: usize = 100;

#[derive(Debug, Clone, PartialEq)]
pub enum TokenType {
    LeftBrace,
    RightBrace,
    LeftBracket,
    RightBracket,
    Colon,
    Comma,
    String,
    Literal,
}

#[derive(Debug, Clone)]
pub struct Token {
    pub token_type: TokenType,
    pub value: String,
    pub start: usize,
    pub end: usize,
}

struct ContainerState {
    container_type: &'static str,
    keys: HashSet<String>,
}

// Tokenize standard ZTAN JSON input according to RFC 8259 rules
pub fn tokenize_json(json_str: &str) -> Result<Vec<Token>, String> {
    let bytes = json_str.as_bytes();
    let n = bytes.len();
    if n > MAX_BYTES {
        return Err(format!("[JCS] JSON payload of {} bytes exceeds MAX_BYTES buffer of {}", n, MAX_BYTES));
    }

    let json_number_regex = Regex::new(r"^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$").unwrap();
    let exponent_regex = Regex::new(r"[eE][+-]?(\d+)").unwrap();

    let mut tokens = Vec::new();
    let mut i = 0;

    while i < n {
        let char_val = bytes[i] as char;

        // Skip whitespace
        if char_val == ' ' || char_val == '\t' || char_val == '\n' || char_val == '\r' {
			i += 1;
			continue;
        }

        match char_val {
            '{' => {
                tokens.push(Token { token_type: TokenType::LeftBrace, value: "{".to_string(), start: i, end: i + 1 });
                i += 1;
            }
            '}' => {
                tokens.push(Token { token_type: TokenType::RightBrace, value: "}".to_string(), start: i, end: i + 1 });
                i += 1;
            }
            '[' => {
                tokens.push(Token { token_type: TokenType::LeftBracket, value: "[".to_string(), start: i, end: i + 1 });
                i += 1;
            }
            ']' => {
                tokens.push(Token { token_type: TokenType::RightBracket, value: "]".to_string(), start: i, end: i + 1 });
                i += 1;
            }
            ':' => {
                tokens.push(Token { token_type: TokenType::Colon, value: ":".to_string(), start: i, end: i + 1 });
                i += 1;
            }
            ',' => {
                tokens.push(Token { token_type: TokenType::Comma, value: ",".to_string(), start: i, end: i + 1 });
                i += 1;
            }
            '"' => {
                let start = i;
                let mut key_val = String::new();
                i += 1; // skip opening quote

                while i < n && bytes[i] as char != '"' {
                    if bytes[i] as char == '\\' {
                        if i + 1 >= n {
                            return Err("[JCS] Unterminated escape sequence in string literal".to_string());
                        }
                        let next_char = bytes[i + 1] as char;
                        key_val.push('\\');
                        key_val.push(next_char);
                        i += 2;
                    } else {
                        key_val.push(bytes[i] as char);
                        i += 1;
                    }

                    if key_val.len() > MAX_STRING {
                        return Err(format!("[JCS] Parsed string token exceeds safety limit of {} characters", MAX_STRING));
                    }
                }

                if i >= n {
                    return Err("[JCS] Unterminated string literal detected".to_string());
                }
                i += 1; // skip closing quote

                // Catch lone surrogates in keys/strings
                if has_lone_surrogate(&key_val) {
                    return Err("[JCS] Lone surrogates are strictly forbidden to prevent UTF-8 encoding anomalies".to_string());
                }

                tokens.push(Token { token_type: TokenType::String, value: key_val, start, end: i });
            }
            _ => {
                // Extract literal sequence
                let start = i;
                let mut lit_val = String::new();

                while i < n && !is_whitespace(bytes[i] as char) && !is_delimiter(bytes[i] as char) {
                    lit_val.push(bytes[i] as char);
                    i += 1;
                }

                // Alphabetical validation
                if contains_letters(&lit_val) {
                    let words = extract_words(&lit_val);
                    for w in words {
                        if w != "true" && w != "false" && w != "null" && w != "e" && w != "E" {
                            return Err(format!("[JCS] Invalid unquoted literal or identifier detected: {:?}", w));
                        }
                    }
                }

                // Strictly validate JSON numeric limits & negative-zero rule
                if is_numeric_like(&lit_val) {
                    if lit_val.len() > MAX_NUM_LEN {
                        return Err(format!("[JCS] Numeric literal length exceeds safety limit of {} characters", MAX_NUM_LEN));
                    }

                    if !json_number_regex.is_match(&lit_val) {
                        return Err(format!("[JCS] Malformed numeric literal detected: {:?}", lit_val));
                    }

                    if lit_val == "-0" {
                        return Err("[JCS] Negative zero \"-0\" is strictly prohibited under canonicalization rules".to_string());
                    }

                    // Enforce exponent ceiling limit
                    if let Some(captures) = exponent_regex.captures(&lit_val) {
                        if let Some(match_val) = captures.get(1) {
                            if let Ok(mag) = match_val.as_str().parse::<u32>() {
                                if mag > 308 {
                                    return Err(format!("[JCS] Numeric exponent magnitude {} exceeds IEEE-754 cap of 308", mag));
                                }
                            }
                        }
                    }
                }

                tokens.push(Token { token_type: TokenType::Literal, value: lit_val, start, end: i });
            }
        }
    }

    Ok(tokens)
}

// Pushdown Automaton syntax and key duplicate verification
pub fn validate_duplicate_keys(json_str: &str) -> Result<(), String> {
    let trimmed = json_str.trim();
    if trimmed.is_empty() {
        return Err("[JCS] Empty JSON payload".to_string());
    }

    let tokens = tokenize_json(json_str)?;
    let mut stack: Vec<ContainerState> = Vec::new();
    let mut expected_next = "ANY";
    let mut has_closed_root = false;
    let mut root_opened = false;

    for token in tokens {
        if has_closed_root {
            return Err(format!("[JCS] Unexpected trailing token at position {}", token.start));
        }

        if token.token_type == TokenType::LeftBrace || token.token_type == TokenType::LeftBracket {
            root_opened = true;
        }

        if stack.len() > MAX_DEPTH {
            return Err(format!("[JCS] Nesting depth exceeds maximum safety limit of {}", MAX_DEPTH));
        }

        match token.token_type {
            TokenType::LeftBrace => {
                if expected_next == "KEY" || expected_next == "COLON" {
                    return Err(format!("[JCS] Unexpected structure token '{{' at position {}", token.start));
                }
                stack.push(ContainerState { container_type: "OBJECT", keys: HashSet::new() });
                expected_next = "KEY";
            }
            TokenType::RightBrace => {
                if stack.is_empty() || stack.last().unwrap().container_type != "OBJECT" {
                    return Err(format!("[JCS] Unexpected closing brace '}}' at position {}", token.start));
                }
                if expected_next == "COLON" {
                    return Err(format!("[JCS] Unexpected trailing colon layout at position {}", token.start));
                }
                stack.pop();
                expected_next = "ANY";
                if !root_opened && stack.is_empty() {
                    has_closed_root = true;
                }
            }
            TokenType::LeftBracket => {
                if expected_next == "KEY" || expected_next == "COLON" {
                    return Err(format!("[JCS] Unexpected array opening '[' at position {}", token.start));
                }
                stack.push(ContainerState { container_type: "ARRAY", keys: HashSet::new() });
                expected_next = "ANY";
            }
            TokenType::RightBracket => {
                if stack.is_empty() || stack.last().unwrap().container_type != "ARRAY" {
                    return Err(format!("[JCS] Unexpected closing bracket ']' at position {}", token.start));
                }
                stack.pop();
                expected_next = "ANY";
                if !root_opened && stack.is_empty() {
                    has_closed_root = true;
                }
            }
            TokenType::Colon => {
                if expected_next != "COLON" {
                    return Err(format!("[JCS] Misplaced colon at position {}", token.start));
                }
                expected_next = "VALUE";
            }
            TokenType::Comma => {
                if stack.is_empty() {
                    return Err(format!("[JCS] Misplaced comma at root position {}", token.start));
                }
                if expected_next == "COLON" || expected_next == "VALUE" {
                    return Err(format!("[JCS] Trailing or misplaced comma at position {}", token.start));
                }
                if stack.last().unwrap().container_type == "OBJECT" {
                    expected_next = "KEY";
                } else {
                    expected_next = "ANY";
                }
            }
            TokenType::String => {
                let mut current_container = "";
                if let Some(top) = stack.last() {
                    current_container = top.container_type;
                }

                if current_container == "OBJECT" {
                    if expected_next == "KEY" {
                        let active_obj = stack.last_mut().unwrap();
                        if active_obj.keys.contains(&token.value) {
                            return Err(format!("[JCS] Duplicate key detected: {:?} in object context", token.value));
                        }
                        if active_obj.keys.len() >= MAX_KEYS {
                            return Err(format!("[JCS] Key count in active object exceeds threshold limit of {} keys", MAX_KEYS));
                        }
                        active_obj.keys.insert(token.value.clone());
                        expected_next = "COLON";
                    } else if expected_next == "VALUE" {
                        expected_next = "ANY";
                    } else {
                        return Err(format!("[JCS] Unexpected string literal at position {}", token.start));
                    }
                } else {
                    if expected_next == "COLON" {
                        return Err(format!("[JCS] Misplaced string token at position {}", token.start));
                    }
                    expected_next = "ANY";
                }
            }
            TokenType::Literal => {
                if let Some(top) = stack.last() {
                    if top.container_type == "OBJECT" && expected_next != "VALUE" {
                        return Err(format!("[JCS] Unexpected literal representation at position {}", token.start));
                    }
                } else if expected_next == "COLON" {
                    return Err(format!("[JCS] Unexpected literal representation at position {}", token.start));
                }
                expected_next = "ANY";
            }
        }

        if !root_opened && stack.is_empty() {
            has_closed_root = true;
        }
    }

    if !stack.is_empty() {
        return Err("[JCS] Unclosed JSON containers detected at EOF".to_string());
    }

    Ok(())
}

fn is_whitespace(c: char) -> bool {
    c == ' ' || c == '\t' || c == '\n' || c == '\r'
}

fn is_delimiter(c: char) -> bool {
    c == '{' || c == '}' || c == '[' || c == ']' || c == ':' || c == ','
}

fn contains_letters(s: &str) -> bool {
    s.chars().any(|c| c.is_ascii_alphabetic())
}

fn is_numeric_like(s: &str) -> bool {
    if s.is_empty() {
        return false;
	}
    let first = s.chars().next().unwrap();
    first.is_ascii_digit() || first == '-' || first == '.'
}

fn extract_words(s: &str) -> Vec<String> {
    let mut words = Vec::new();
    let mut current = String::new();
    for c in s.chars() {
        if c.is_ascii_alphabetic() {
            current.push(c);
        } else {
            if !current.is_empty() {
                words.push(current.clone());
                current.clear();
            }
        }
    }
    if !current.is_empty() {
        words.push(current);
    }
    words
}

fn has_lone_surrogate(s: &str) -> bool {
    // Look for escaped surrogate pairs: \uD800 - \uDFFF
    let bytes = s.as_bytes();
    let n = bytes.len();
    let mut i = 0;

    while i < n {
        if bytes[i] as char == '\\' && i + 5 < n && bytes[i + 1] as char == 'u' {
            if let Ok(val) = u32::from_str_radix(&s[i+2..i+6], 16) {
                if val >= 0xD800 && val <= 0xDFFF {
                    if val >= 0xD800 && val <= 0xDBFF {
                        // Check if paired with a low surrogate
                        if i + 11 < n && bytes[i + 6] as char == '\\' && bytes[i + 7] as char == 'u' {
                            if let Ok(next_val) = u32::from_str_radix(&s[i+8..i+12], 16) {
                                if next_val >= 0xDC00 && next_val <= 0xDFFF {
                                    i += 11;
                                    continue;
                                }
                            }
                        }
                    }
                    return true; // Lone surrogate found!
                }
            }
        }
        i += 1;
    }
    false
}
