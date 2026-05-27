export interface ExecutionContract {
    expectedInputs: string[];
    expectedOutputs: string[];
    allowOptional: boolean;
}

export interface ContractValidationReport {
    isValid: boolean;
    missingInputs: string[];
    missingOutputs: string[];
    unexpectedKeys: string[];
    error?: string;
}

export class ExecutionContractValidator {
    /**
     * Validates input/output contracts.
     */
    public validateContract(
        contract: ExecutionContract,
        inputs: Record<string, any>,
        outputs: Record<string, any>
    ): ContractValidationReport {
        const missingInputs: string[] = [];
        const missingOutputs: string[] = [];
        const unexpectedKeys: string[] = [];

        // 1. Verify mandatory input keys are present
        for (const inputKey of contract.expectedInputs) {
            if (!(inputKey in inputs)) {
                missingInputs.push(inputKey);
            }
        }

        // 2. Verify mandatory output keys are present
        for (const outputKey of contract.expectedOutputs) {
            if (!(outputKey in outputs)) {
                missingOutputs.push(outputKey);
            }
        }

        // 3. Verify no unexpected keys exist if allowOptional is false
        if (!contract.allowOptional) {
            const contractInputSet = new Set(contract.expectedInputs);
            for (const key of Object.keys(inputs)) {
                if (!contractInputSet.has(key)) {
                    unexpectedKeys.push(key);
                }
            }
        }

        const isValid = missingInputs.length === 0 && missingOutputs.length === 0 && unexpectedKeys.length === 0;
        let error: string | undefined;

        if (!isValid) {
            error = `Contract validation failed: missingInputs=[${missingInputs.join(', ')}], missingOutputs=[${missingOutputs.join(', ')}], unexpectedKeys=[${unexpectedKeys.join(', ')}]`;
        }

        return {
            isValid,
            missingInputs,
            missingOutputs,
            unexpectedKeys,
            error
        };
    }
}
