import { TelemetryEvent } from './replay-compressor.js';

export interface SchemaMigration {
    sourceVersion: string;
    targetVersion: string;
    transform: (event: any) => any;
}

export interface ArchivedValidator {
    ruleName: string;
    version: string;
    validate: (inputs: Record<string, any>) => boolean;
}

export class HistoricalReplayCompatibility {
    private migrations = new Map<string, SchemaMigration[]>();
    private validators = new Map<string, ArchivedValidator>();

    /**
     * Registers a schema migration pathway
     */
    public registerMigration(migration: SchemaMigration): void {
        const key = `${migration.sourceVersion}->${migration.targetVersion}`;
        const existing = this.migrations.get(key) || [];
        existing.push(migration);
        this.migrations.set(key, existing);
    }

    /**
     * Registers an archived validator
     */
    public registerArchivedValidator(validator: ArchivedValidator): void {
        const key = `${validator.ruleName}@${validator.version}`;
        this.validators.set(key, validator);
    }

    /**
     * Up-casts deprecated telemetry events to match the latest schema structures.
     */
    public reconstructLegacyEvent(legacyEvent: any, sourceVersion: string, targetVersion: string): TelemetryEvent {
        let currentEvent = { ...legacyEvent };
        
        const key = `${sourceVersion}->${targetVersion}`;
        const migrationsToApply = this.migrations.get(key);
        if (migrationsToApply) {
            for (const migration of migrationsToApply) {
                currentEvent = migration.transform(currentEvent);
            }
        } else {
            // Apply fallback default upgrades if no migration registered
            if (currentEvent.id === undefined) currentEvent.id = `legacy-${Math.random().toString(36).substring(2, 11)}`;
            if (currentEvent.type === undefined) currentEvent.type = 'LEGACY_EVENT';
            if (currentEvent.timestamp === undefined) currentEvent.timestamp = Date.now();
            if (currentEvent.entropyScore === undefined) currentEvent.entropyScore = 0.0;
            
            const payload: Record<string, any> = currentEvent.payload ? { ...currentEvent.payload } : {};
            for (const k of Object.keys(currentEvent)) {
                if (!['id', 'type', 'timestamp', 'entropyScore', 'payload'].includes(k)) {
                    payload[k] = currentEvent[k];
                }
            }
            currentEvent.payload = payload;
        }

        // Add compatibility metadata layer
        currentEvent.payload = {
            ...currentEvent.payload,
            _compatibility: {
                upcasted: true,
                originalVersion: sourceVersion,
                targetVersion: targetVersion,
                upcastedAt: Date.now()
            }
        };

        return currentEvent as TelemetryEvent;
    }

    /**
     * Evaluates legacy validation assertions for retired rules when replaying historical traces.
     */
    public emulateArchivedValidator(ruleName: string, version: string, inputs: Record<string, any>): boolean {
        const key = `${ruleName}@${version}`;
        const validator = this.validators.get(key);
        if (!validator) {
            // Fallback default emulation: if no validator, check if inputs has any keys
            return Object.keys(inputs).length > 0;
        }
        try {
            return validator.validate(inputs);
        } catch (_err) {
            return false;
        }
    }
}
