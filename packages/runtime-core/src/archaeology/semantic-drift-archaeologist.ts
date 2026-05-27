export interface SemanticDriftReport {
    vocabularyDriftIndex: number; // 0.0 to 1.0
    semanticVocabularySpike: boolean;
    mutatedTerms: Array<{ term: string; baselineMeaning: string; currentMeaning: string; count: number }>;
    warnings: string[];
}

export class SemanticDriftArchaeologist {
    private baselineMeanings = new Map<string, string>();

    constructor() {
        // Register basic dictionary meanings as stable base baseline
        this.baselineMeanings.set('freeze', 'absolute deployment lock / structural CI blocks in place');
        this.baselineMeanings.set('thaw', 'emergency override bypass requiring multi-signature SRE consensus');
        this.baselineMeanings.set('rehabilitation', 'completion of active simplification milestones before exit');
        this.baselineMeanings.set('resurrection', 'controlled recovery of retired modules with environment verification');
    }

    /**
     * Registers a custom term meaning to the baseline.
     */
    public registerBaselineMeaning(term: string, meaning: string): void {
        this.baselineMeanings.set(term, meaning);
    }

    /**
     * Audits current rationales, playbooks, and commands vocabulary against the baseline dictionary
     * to identify semantic drift inside engineering organizations.
     */
    public auditSemanticDrift(rationales: string[]): SemanticDriftReport {
        let totalTermsCount = 0;
        let mutatedTermsCount = 0;
        const mutatedTerms: Array<{ term: string; baselineMeaning: string; currentMeaning: string; count: number }> = [];
        const warnings: string[] = [];

        // Check for specific vocabulary drift signatures in text rationales
        // e.g., using "freeze" to merely mean "slowdown deploy"
        const lowercaseRationales = rationales.map(r => r.toLowerCase());

        for (const [term, baseMeaning] of this.baselineMeanings.entries()) {
            let matchedDriftCount = 0;
            let currentMeaningDesc = '';

            if (term === 'freeze') {
                for (const text of lowercaseRationales) {
                    if (text.includes('freeze') && (text.includes('slowdown') || text.includes('soft-freeze') || text.includes('advisory'))) {
                        matchedDriftCount++;
                        currentMeaningDesc = 'interpreted as advisory deployment slowdown rather than absolute CI/CD blockade';
                    }
                }
            }

            if (term === 'thaw') {
                for (const text of lowercaseRationales) {
                    if (text.includes('thaw') && (text.includes('convenience') || text.includes('routine') || text.includes('single-click'))) {
                        matchedDriftCount++;
                        currentMeaningDesc = 'interpreted as routine/convenience single-operator toggle rather than emergency consensus bypass';
                    }
                }
            }

            if (matchedDriftCount > 0) {
                totalTermsCount++;
                mutatedTermsCount++;
                mutatedTerms.push({
                    term,
                    baselineMeaning: baseMeaning,
                    currentMeaning: currentMeaningDesc,
                    count: matchedDriftCount
                });
            }
        }

        const vocabularyDriftIndex = totalTermsCount > 0 ? mutatedTermsCount / totalTermsCount : 0.0;
        const semanticVocabularySpike = vocabularyDriftIndex > 0.40;

        if (semanticVocabularySpike) {
            warnings.push('CRITICAL: High organizational semantic lexicon drift detected! SRE teams have mutated core operational vocabulary, neutralizing governance restraints.');
        } else if (vocabularyDriftIndex > 0) {
            warnings.push('WARNING: Moderate lexicon drift detected. Vocabulary definitions are starting to diverge from baseline design constraints.');
        }

        return {
            vocabularyDriftIndex: Math.round(vocabularyDriftIndex * 100) / 100,
            semanticVocabularySpike,
            mutatedTerms,
            warnings
        };
    }
}
