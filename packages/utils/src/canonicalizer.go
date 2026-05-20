package src

import (
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"
)

// Constants defining strict operational boundaries (matching TS & Python baselines)
const (
	MaxDepth   = 64
	MaxBytes   = 1000000
	MaxKeys    = 10000
	MaxString  = 65536
	MaxNumLen  = 100
)

// TokenType defines lexical token categories
type TokenType string

const (
	LeftBrace    TokenType = "LEFT_BRACE"
	RightBrace   TokenType = "RIGHT_BRACE"
	LeftBracket  TokenType = "LEFT_BRACKET"
	RightBracket TokenType = "RIGHT_BRACKET"
	Colon        TokenType = "COLON"
	Comma        TokenType = "COMMA"
	String       TokenType = "STRING"
	Literal      TokenType = "LITERAL"
)

// Token represents a lexical unit
type Token struct {
	Type  TokenType
	Value string
	Start int
	End   int
}

// Strict JSON Number Syntax regex matching RFC 8259
var jsonNumberRegex = regexp.MustCompile(`^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$`)
var exponentRegex = regexp.MustCompile(`[eE][+-]?(\d+)`)

// TokenizeJson converts a raw JSON string into a slice of tokens
func TokenizeJson(jsonStr string) ([]Token, error) {
	n := len(jsonStr)
	if n > MaxBytes {
		return nil, fmt.Errorf("[JCS] JSON payload of %d bytes exceeds MAX_BYTES buffer of %d", n, MaxBytes)
	}

	var tokens []Token
	i := 0

	for i < n {
		char := jsonStr[i]

		// Skip whitespace characters
		if char == ' ' || char == '\t' || char == '\n' || char == '\r' {
			i++
			continue
		}

		switch char {
		case '{':
			tokens = append(tokens, Token{Type: LeftBrace, Value: "{", Start: i, End: i + 1})
			i++
		case '}':
			tokens = append(tokens, Token{Type: RightBrace, Value: "}", Start: i, End: i + 1})
			i++
		case '[':
			tokens = append(tokens, Token{Type: LeftBracket, Value: "[", Start: i, End: i + 1})
			i++
		case ']':
			tokens = append(tokens, Token{Type: RightBracket, Value: "]", Start: i, End: i + 1})
			i++
		case ':':
			tokens = append(tokens, Token{Type: Colon, Value: ":", Start: i, End: i + 1})
			i++
		case ',':
			tokens = append(tokens, Token{Type: Comma, Value: ",", Start: i, End: i + 1})
			i++
		case '"':
			start := i
			keyVal := ""
			i++ // skip opening quote

			for i < n && jsonStr[i] != '"' {
				if jsonStr[i] == '\\' {
					if i+1 >= n {
						return nil, errors.New("[JCS] Unterminated escape sequence in string literal")
					}
					nextChar := jsonStr[i+1]
					keyVal += "\\" + string(nextChar)
					i += 2
				} else {
					keyVal += string(jsonStr[i])
					i++
				}

				if len(keyVal) > MaxString {
					return nil, fmt.Errorf("[JCS] Parsed string token exceeds safety limit of %d characters", MaxString)
				}
			}

			if i >= n {
				return nil, errors.New("[JCS] Unterminated string literal detected")
			}
			i++ // skip closing quote

			// Check for lone surrogates in keys/strings to prevent consensus splits
			if hasLoneSurrogate(keyVal) {
				return nil, errors.New("[JCS] Lone surrogates are strictly forbidden to prevent UTF-8 encoding anomalies")
			}

			tokens = append(tokens, Token{Type: String, Value: keyVal, Start: start, End: i})

		default:
			// Extract literal primitives (true, false, null, and numeric sequences)
			start := i
			litVal := ""

			for i < n && !isWhitespace(jsonStr[i]) && !isDelimiter(jsonStr[i]) {
				litVal += string(jsonStr[i])
				i++
			}

			// Validate alphabetical literals
			if containsLetters(litVal) {
				words := extractWords(litVal)
				for _, w := range words {
					if w != "true" && w != "false" && w != "null" && w != "e" && w != "E" {
						return nil, fmt.Errorf("[JCS] Invalid unquoted literal or identifier detected: %q", w)
					}
				}
			}

			// Validate strict JSON numeric limits (RFC 8259) & JCS negative-zero prohibition
			if isNumericLike(litVal) {
				if len(litVal) > MaxNumLen {
					return nil, fmt.Errorf("[JCS] Numeric literal length exceeds safety limit of %d characters", MaxNumLen)
				}

				if !jsonNumberRegex.MatchString(litVal) {
					return nil, fmt.Errorf("[JCS] Malformed numeric literal detected: %q", litVal)
				}

				if litVal == "-0" {
					return nil, errors.New("[JCS] Negative zero \"-0\" is strictly prohibited under canonicalization rules")
				}

				// Enforce exponent limits
				matches := exponentRegex.FindStringSubmatch(litVal)
				if len(matches) > 1 {
					mag, err := strconv.Atoi(matches[1])
					if err == nil && mag > 308 {
						return nil, fmt.Errorf("[JCS] Numeric exponent magnitude %d exceeds IEEE-754 cap of 308", mag)
					}
				}
			}

			tokens = append(tokens, Token{Type: Literal, Value: litVal, Start: start, End: i})
		}
	}

	return tokens, nil
}

// ContainerState tracks active objects and key collections
type ContainerState struct {
	Type string
	Keys map[string]bool
}

// ValidateDuplicateKeys executes the PDA validation over the token sequence
func ValidateDuplicateKeys(jsonStr string) error {
	trimmed := strings.TrimSpace(jsonStr)
	if trimmed == "" {
		return errors.New("[JCS] Empty JSON payload")
	}

	tokens, err := TokenizeJson(jsonStr)
	if err != nil {
		return err
	}

	var stack []ContainerState
	expectedNext := "ANY" // can be ANY, KEY, COLON, VALUE
	hasClosedRoot := false
	rootOpened := false

	for _, token := range tokens {
		if hasClosedRoot {
			return fmt.Errorf("[JCS] Unexpected trailing token at position %d", token.Start)
		}

		if token.Type == LeftBrace || token.Type == LeftBracket {
			rootOpened = true
		}

		// Enforce nesting limits eagerly
		if len(stack) > MaxDepth {
			return fmt.Errorf("[JCS] Nesting depth exceeds maximum safety limit of %d", MaxDepth)
		}

		switch token.Type {
		case LeftBrace:
			if expectedNext == "KEY" || expectedNext == "COLON" {
				return fmt.Errorf("[JCS] Unexpected structure token '{' at position %d", token.Start)
			}
			stack = append(stack, ContainerState{Type: "OBJECT", Keys: make(map[string]bool)})
			expectedNext = "KEY"

		case RightBrace:
			if len(stack) == 0 || stack[len(stack)-1].Type != "OBJECT" {
				return fmt.Errorf("[JCS] Unexpected closing brace '}' at position %d", token.Start)
			}
			if expectedNext == "COLON" {
				return fmt.Errorf("[JCS] Unexpected trailing colon layout at position %d", token.Start)
			}
			stack = stack[:len(stack)-1]
			expectedNext = "ANY"
			if !rootOpened && len(stack) == 0 {
				hasClosedRoot = true
			}

		case LeftBracket:
			if expectedNext == "KEY" || expectedNext == "COLON" {
				return fmt.Errorf("[JCS] Unexpected array opening '[' at position %d", token.Start)
			}
			stack = append(stack, ContainerState{Type: "ARRAY", Keys: nil})
			expectedNext = "ANY"

		case RightBracket:
			if len(stack) == 0 || stack[len(stack)-1].Type != "ARRAY" {
				return fmt.Errorf("[JCS] Unexpected closing bracket ']' at position %d", token.Start)
			}
			stack = stack[:len(stack)-1]
			expectedNext = "ANY"
			if !rootOpened && len(stack) == 0 {
				hasClosedRoot = true
			}

		case Colon:
			if expectedNext != "COLON" {
				return fmt.Errorf("[JCS] Misplaced colon at position %d", token.Start)
			}
			expectedNext = "VALUE"

		case Comma:
			if len(stack) == 0 {
				return fmt.Errorf("[JCS] Misplaced comma at root position %d", token.Start)
			}
			if expectedNext == "COLON" || expectedNext == "VALUE" {
				return fmt.Errorf("[JCS] Trailing or misplaced comma at position %d", token.Start)
			}
			if stack[len(stack)-1].Type == "OBJECT" {
				expectedNext = "KEY"
			} else {
				expectedNext = "ANY"
			}

		case String:
			currentContainer := ""
			if len(stack) > 0 {
				currentContainer = stack[len(stack)-1].Type
			}

			if currentContainer == "OBJECT" {
				if expectedNext == "KEY" {
					// Duplicate key verification
					activeObj := stack[len(stack)-1]
					if activeObj.Keys[token.Value] {
						return fmt.Errorf("[JCS] Duplicate key detected: %q in object context", token.Value)
					}
					if len(activeObj.Keys) >= MaxKeys {
						return fmt.Errorf("[JCS] Key count in active object exceeds threshold limit of %d keys", MaxKeys)
					}
					activeObj.Keys[token.Value] = true
					expectedNext = "COLON"
				} else if expectedNext == "VALUE" {
					expectedNext = "ANY"
				} else {
					return fmt.Errorf("[JCS] Unexpected string literal at position %d", token.Start)
				}
			} else {
				if expectedNext == "COLON" {
					return fmt.Errorf("[JCS] Misplaced string token at position %d", token.Start)
				}
				expectedNext = "ANY"
			}

		case Literal:
			if len(stack) > 0 && stack[len(stack)-1].Type == "OBJECT" {
				if expectedNext != "VALUE" {
					return fmt.Errorf("[JCS] Unexpected literal representation at position %d", token.Start)
				}
			} else {
				if expectedNext == "COLON" {
					return fmt.Errorf("[JCS] Unexpected literal representation at position %d", token.Start)
				}
			}
			expectedNext = "ANY"
		}

		if !rootOpened && len(stack) == 0 {
			hasClosedRoot = true
		}
	}

	if len(stack) != 0 {
		return errors.New("[JCS] Unclosed JSON containers detected at EOF")
	}

	return nil
}

// Helper utilities

func isWhitespace(c byte) bool {
	return c == ' ' || c == '\t' || c == '\n' || c == '\r'
}

func isDelimiter(c byte) bool {
	return c == '{' || c == '}' || c == '[' || c == ']' || c == ':' || c == ','
}

func containsLetters(s string) bool {
	return strings.ContainsAny(s, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")
}

func isNumericLike(s string) bool {
	if len(s) == 0 {
		return false
	}
	first := s[0]
	return (first >= '0' && first <= '9') || first == '-' || first == '.'
}

func extractWords(s string) []string {
	var words []string
	var current []rune
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') {
			current = append(current, r)
		} else {
			if len(current) > 0 {
				words = append(words, string(current))
				current = nil
			}
		}
	}
	if len(current) > 0 {
		words = append(words, string(current))
	}
	return words
}

func hasLoneSurrogate(s string) bool {
	// Go strings are UTF-8, lone surrogate ranges are [\uD800-\uDFFF]
	// In standard Go, utf8.DecodeRuneInString exposes replacements for invalid sequences
	// We check for any isolated low or high surrogate runes in standard UTF-16 representation
	// represented inside JCS JSON unicode escape forms.
	for i := 0; i < len(s); i++ {
		if s[i] == '\\' && i+5 < len(s) && s[i+1] == 'u' {
			hexVal := s[i+2 : i+6]
			val, err := strconv.ParseUint(hexVal, 16, 32)
			if err == nil {
				// Surrogate range is [0xD800, 0xDFFF]
				if val >= 0xD800 && val <= 0xDFFF {
					// We check if this is paired. Since we iterate character by character:
					// A valid high surrogate (0xD800 - 0xDBFF) must be immediately followed by a low surrogate (0xDC00 - 0xDFFF)
					if val >= 0xD800 && val <= 0xDBFF {
						// Look ahead for next escape
						if i+11 < len(s) && s[i+6] == '\\' && s[i+7] == 'u' {
							nextHex := s[i+8 : i+12]
							nextVal, err := strconv.ParseUint(nextHex, 16, 32)
							if err == nil && nextVal >= 0xDC00 && nextVal <= 0xDFFF {
								// Valid pair, skip ahead
								i += 11
								continue
							}
						}
					}
					// Otherwise, it is a lone surrogate!
					return true
				}
			}
		}
	}
	return false
}
