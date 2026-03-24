import * as fsLib from 'fs-extra';
import pathLib from 'path';
import logger from '@libs/utils';

export interface Blueprint {
    project_name: string;
    frontend_stack: string;
    backend_stack: string;
    database: string;
    services: string[];
    ports: Record<string, number>;
    env_variables: string[];
}

export class BlueprintManager {
    private static BLUEPRINT_PATH = pathLib.join(process.cwd(), 'system', 'blueprint.json');

    static async getBlueprint(): Promise<Blueprint | null> {
        if (await fsLib.pathExists(this.BLUEPRINT_PATH)) {
            return await fsLib.readJson(this.BLUEPRINT_PATH);
        }
        return null;
    }

    static async saveBlueprint(blueprint: Blueprint) {
        await fsLib.ensureDir(pathLib.dirname(this.BLUEPRINT_PATH));
        await fsLib.writeJson(this.BLUEPRINT_PATH, blueprint, { spaces: 2 });
        logger.info('Global Blueprint Contract updated.');
    }

    static async validateContract(candidate: Partial<Blueprint>): Promise<boolean> {
        const current = await this.getBlueprint();
        if (!current) return true; // Initial creation
        
        // Basic contract enforcement: stacks cannot change mid-build
        if (candidate.frontend_stack && candidate.frontend_stack !== current.frontend_stack) return false;
        if (candidate.backend_stack && candidate.backend_stack !== current.backend_stack) return false;
        
        return true;
    }
}
