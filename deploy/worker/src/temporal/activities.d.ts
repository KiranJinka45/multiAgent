import { ActivityInput, BuildActivityResult, DeployActivityResult } from '@packages/contracts';
export declare function architectActivity(input: ActivityInput): Promise<void>;
export declare function generatorActivity(input: ActivityInput): Promise<void>;
export declare function buildActivity(input: ActivityInput): Promise<BuildActivityResult>;
export declare function deployActivity(input: ActivityInput & {
    buildArtifacts: string[];
}): Promise<DeployActivityResult>;
