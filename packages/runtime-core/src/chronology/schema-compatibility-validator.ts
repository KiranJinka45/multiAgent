import fs from 'fs';

/**
 * ─── ZTAN Schema Compatibility Validator ─────────────────────────────────────
 * Asserts contract schemas on historical JSON evidence and logs. Allows
 * backward-compatibility validation and provides hooks to apply migration transforms.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface SchemaValidationResult {
    isValid: boolean;
    missingFields: string[];
    migrationApplied: boolean;
    errors: string[];
}

export class SchemaCompatibilityValidator {
    /**
     * Validates that a file's JSON payload conforms to required field properties.
     */
    validateFile(filePath: string, requiredFields: string[]): SchemaValidationResult {
        const result: SchemaValidationResult = {
            isValid: true,
            missingFields: [],
            migrationApplied: false,
            errors: []
        };

        try {
            if (!fs.existsSync(filePath)) {
                result.isValid = false;
                result.errors.push(`File not found: ${filePath}`);
                return result;
            }

            const raw = fs.readFileSync(filePath, 'utf8');
            let data: any;
            try {
                data = JSON.parse(raw);
            } catch (err: any) {
                result.isValid = false;
                result.errors.push(`Invalid JSON syntax in file: ${err.message}`);
                return result;
            }

            for (const field of requiredFields) {
                if (data[field] === undefined) {
                    result.isValid = false;
                    result.missingFields.push(field);
                }
            }
        } catch (err: any) {
            result.isValid = false;
            result.errors.push(`System validation error: ${err.message}`);
        }

        return result;
    }

    /**
     * Applies a migration transform to map older schema records to current formats.
     */
    migrate(filePath: string, migrationFn: (oldData: any) => any): SchemaValidationResult {
        const result: SchemaValidationResult = {
            isValid: true,
            missingFields: [],
            migrationApplied: false,
            errors: []
        };

        try {
            if (!fs.existsSync(filePath)) {
                result.isValid = false;
                result.errors.push(`File not found: ${filePath}`);
                return result;
            }

            const raw = fs.readFileSync(filePath, 'utf8');
            let data: any;
            try {
                data = JSON.parse(raw);
            } catch (err: any) {
                result.isValid = false;
                result.errors.push(`Invalid JSON syntax in file: ${err.message}`);
                return result;
            }

            const migrated = migrationFn(data);
            fs.writeFileSync(filePath, JSON.stringify(migrated, null, 2), 'utf8');
            result.migrationApplied = true;
        } catch (err: any) {
            result.isValid = false;
            result.errors.push(`Migration execution error: ${err.message}`);
        }

        return result;
    }
}
