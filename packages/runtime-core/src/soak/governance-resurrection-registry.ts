export interface RetiredSubsystemMetadata {
    name: string;
    type: 'subsystem' | 'policy' | 'telemetry' | 'playbook' | 'dashboard';
    retiredAt: Date;
    provenance: {
        gitCommit: string;
        retiredBy: string;
        reason: string;
    };
    dependencies: string[];
    restorationPrerequisites: string[];
    historicalEfficacy: number; // 0.0 to 1.0
    payload: Record<string, any>; // Serialized config or logic
}

export interface ResurrectionRequest {
    restorationReason: string;
    expectedBlastRadius: 'LOW' | 'MEDIUM' | 'HIGH';
    survivabilityCategory: 'catastrophic' | 'operational' | 'convenience';
    reRetirementCondition: string;
    telemetryDeltaEstimate: number; // 0.0 to 1.0
    rollbackPlan: string;
    sunsetDays: number;
}

export interface ComplexityDebtReport {
    subsystemName: string;
    governanceDebt: number;
    telemetryDebt: number;
    operatorCognitionDebt: number;
    maintenanceBurden: number;
}

export interface EnvironmentCertificationReport {
    subsystemName: string;
    certified: boolean;
    replayCompatibilityPassed: boolean;
    telemetryAvailabilityPassed: boolean;
    schemaCompatibilityPassed: boolean;
    dependencySurvivabilityPassed: boolean;
    compressionReversibilityPassed: boolean;
    explainabilityContinuityPassed: boolean;
    issues: string[];
}

export interface ResurrectionReport {
    name: string;
    success: boolean;
    restoredState?: {
        name: string;
        type: string;
        activePayload: Record<string, any>;
        restoredAt: Date;
        sunsetAt: Date;
        requestContext: ResurrectionRequest;
    };
    unresolvedDependencies: string[];
    unmetPrerequisites: string[];
    complexityDebt?: ComplexityDebtReport;
    certificationReport?: EnvironmentCertificationReport;
    error?: string;
}

export class GovernanceResurrectionRegistry {
    private registry = new Map<string, RetiredSubsystemMetadata>();
    private activeResurrections = new Map<string, Record<string, any>>();
    private activeSystemComponents = new Set<string>();

    constructor(activeComponents?: string[]) {
        if (activeComponents) {
            activeComponents.forEach(c => this.activeSystemComponents.add(c));
        }
    }

    /**
     * Add an active component to the system topology
     */
    public addActiveComponent(name: string): void {
        this.activeSystemComponents.add(name);
    }

    /**
     * Records a retired item with its context, dependencies, and payload.
     */
    public registerRetirement(metadata: RetiredSubsystemMetadata): void {
        this.registry.set(metadata.name, metadata);
    }

    /**
     * Retrieves retired metadata.
     */
    public getRetirementMetadata(name: string): RetiredSubsystemMetadata | undefined {
        return this.registry.get(name);
    }

    /**
     * Estimates reintroduced complexity debt for a retired subsystem.
     */
    public calculateComplexityDebt(name: string): ComplexityDebtReport {
        const metadata = this.registry.get(name);
        if (!metadata) {
            return {
                subsystemName: name,
                governanceDebt: 0,
                telemetryDebt: 0,
                operatorCognitionDebt: 0,
                maintenanceBurden: 0
            };
        }

        const depCount = metadata.dependencies.length;
        const payloadFields = Object.keys(metadata.payload || {}).length;

        const governanceDebt = depCount * 25 + 20;
        const telemetryDebt = metadata.type === 'telemetry' ? 100 : 30;
        const operatorCognitionDebt = metadata.type === 'subsystem' ? 75 : 25;
        const maintenanceBurden = (depCount * 15) + (payloadFields * 10);

        return {
            subsystemName: name,
            governanceDebt,
            telemetryDebt,
            operatorCognitionDebt,
            maintenanceBurden
        };
    }

    /**
     * Performs a pre-flight environment certification check for a subsystem.
     */
    public certifyEnvironment(name: string, environmentConditions?: Record<string, any>): EnvironmentCertificationReport {
        const metadata = this.registry.get(name);
        const issues: string[] = [];

        if (!metadata) {
            return {
                subsystemName: name,
                certified: false,
                replayCompatibilityPassed: false,
                telemetryAvailabilityPassed: false,
                schemaCompatibilityPassed: false,
                dependencySurvivabilityPassed: false,
                compressionReversibilityPassed: false,
                explainabilityContinuityPassed: false,
                issues: [`Subsystem '${name}' is not in the resurrection registry.`]
            };
        }

        // Validate environment conditions
        const replayCompatibilityPassed = !(environmentConditions?.DISABLE_REPLAY_COMPATIBILITY === true);
        if (!replayCompatibilityPassed) issues.push('Replay archaeology compatibility check failed.');

        const telemetryAvailabilityPassed = !(environmentConditions?.MISSING_TELEMETRY_FIELDS === true);
        if (!telemetryAvailabilityPassed) issues.push('Required telemetry fields are unavailable.');

        const schemaCompatibilityPassed = !(environmentConditions?.INCOMPATIBLE_SCHEMAS === true);
        if (!schemaCompatibilityPassed) issues.push('Incompatible telemetry schema versions detected.');

        // Dependency survivability (checks if any dependencies are marked deprecated/broken in env)
        let dependencySurvivabilityPassed = true;
        if (environmentConditions?.DEPRECATED_DEPENDENCIES) {
            const deprecatedDeps = new Set<string>(environmentConditions.DEPRECATED_DEPENDENCIES);
            for (const dep of metadata.dependencies) {
                if (deprecatedDeps.has(dep)) {
                    dependencySurvivabilityPassed = false;
                    issues.push(`Dependency '${dep}' is deprecated in the current environment.`);
                }
            }
        }

        const compressionReversibilityPassed = !(environmentConditions?.CORRUPTED_COMPRESSION_ENGINE === true);
        if (!compressionReversibilityPassed) issues.push('Compression reversibility audit failed.');

        const explainabilityContinuityPassed = !(environmentConditions?.EXPLAINABILITY_GAP === true);
        if (!explainabilityContinuityPassed) issues.push('Explainability continuity gap detected.');

        const certified = 
            replayCompatibilityPassed && 
            telemetryAvailabilityPassed && 
            schemaCompatibilityPassed && 
            dependencySurvivabilityPassed && 
            compressionReversibilityPassed && 
            explainabilityContinuityPassed;

        return {
            subsystemName: name,
            certified,
            replayCompatibilityPassed,
            telemetryAvailabilityPassed,
            schemaCompatibilityPassed,
            dependencySurvivabilityPassed,
            compressionReversibilityPassed,
            explainabilityContinuityPassed,
            issues
        };
    }

    /**
     * Validates dependencies and prerequisites under friction-based gates,
     * calculates complexity debt, certifies environment, and restores the archived state.
     */
    public resurrectSubsystem(
        name: string, 
        request: ResurrectionRequest,
        environmentConditions?: Record<string, any>
    ): ResurrectionReport {
        const metadata = this.registry.get(name);
        if (!metadata) {
            return {
                name,
                success: false,
                unresolvedDependencies: [],
                unmetPrerequisites: [],
                error: `Subsystem '${name}' is not registered as retired.`
            };
        }

        // 1. Enforce Structured Resurrection Classification Friction Gates
        if (!request.restorationReason || request.restorationReason.trim().length < 15) {
            return {
                name,
                success: false,
                unresolvedDependencies: [],
                unmetPrerequisites: [],
                error: `Resurrection denied: restorationReason must be at least 15 characters to prevent psychologically "free" resurrections.`
            };
        }

        if (!request.reRetirementCondition || request.reRetirementCondition.trim().length < 15) {
            return {
                name,
                success: false,
                unresolvedDependencies: [],
                unmetPrerequisites: [],
                error: `Resurrection denied: reRetirementCondition must be at least 15 characters to enforce measurable removal triggers.`
            };
        }

        if (!request.rollbackPlan || request.rollbackPlan.trim().length < 15) {
            return {
                name,
                success: false,
                unresolvedDependencies: [],
                unmetPrerequisites: [],
                error: `Resurrection denied: rollbackPlan must be at least 15 characters to ensure clear reversibility plans.`
            };
        }

        if (request.telemetryDeltaEstimate < 0.0 || request.telemetryDeltaEstimate > 1.0) {
            return {
                name,
                success: false,
                unresolvedDependencies: [],
                unmetPrerequisites: [],
                error: `Resurrection denied: telemetryDeltaEstimate must be a valid probability float between 0.0 and 1.0.`
            };
        }

        if (request.sunsetDays <= 0 || request.sunsetDays > 180) {
            return {
                name,
                success: false,
                unresolvedDependencies: [],
                unmetPrerequisites: [],
                error: `Resurrection denied: sunsetDays must be greater than 0 and at most 180 days to prevent infinite complexity drift.`
            };
        }

        // 2. Perform Environment Certification Pre-flight Check
        const certReport = this.certifyEnvironment(name, environmentConditions);
        if (!certReport.certified) {
            return {
                name,
                success: false,
                unresolvedDependencies: [],
                unmetPrerequisites: [],
                certificationReport: certReport,
                error: `Resurrection denied: Environment compatibility certification failed: ${certReport.issues.join('; ')}`
            };
        }

        const unresolvedDependencies: string[] = [];
        const unmetPrerequisites: string[] = [];

        // 3. Validate dependencies
        for (const dep of metadata.dependencies) {
            if (!this.activeSystemComponents.has(dep) && !this.activeResurrections.has(dep)) {
                unresolvedDependencies.push(dep);
            }
        }

        // 4. Validate restoration prerequisites
        for (const prereq of metadata.restorationPrerequisites) {
            if (environmentConditions) {
                if (!environmentConditions[prereq]) {
                    unmetPrerequisites.push(prereq);
                }
            } else {
                unmetPrerequisites.push(prereq);
            }
        }

        const success = unresolvedDependencies.length === 0 && unmetPrerequisites.length === 0;
        const complexityDebt = this.calculateComplexityDebt(name);

        if (success) {
            this.activeResurrections.set(name, metadata.payload);
            this.activeSystemComponents.add(name);
            const sunsetAt = new Date();
            sunsetAt.setDate(sunsetAt.getDate() + request.sunsetDays);

            return {
                name,
                success: true,
                restoredState: {
                    name: metadata.name,
                    type: metadata.type,
                    activePayload: metadata.payload,
                    restoredAt: new Date(),
                    sunsetAt,
                    requestContext: request
                },
                unresolvedDependencies: [],
                unmetPrerequisites: [],
                complexityDebt,
                certificationReport: certReport
            };
        }

        return {
            name,
            success: false,
            unresolvedDependencies,
            unmetPrerequisites,
            complexityDebt,
            certificationReport: certReport,
            error: `Failed dependency or prerequisite validation for resurrection.`
        };
    }

    /**
     * Checks if a subsystem is currently resurrected.
     */
    public isResurrected(name: string): boolean {
        return this.activeResurrections.has(name);
    }

    /**
     * Gets the payload of a resurrected subsystem.
     */
    public getResurrectedPayload(name: string): Record<string, any> | undefined {
        return this.activeResurrections.get(name);
    }
}
