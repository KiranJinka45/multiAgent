import archiver from 'archiver';
import fs from 'fs-extra';
import path from 'path';
import logger from '../shared/logger';

/**
 * EjectSystem
 * 
 * Bundles the generated project into a production-ready package.
 * Includes:
 * 1. Generated source code
 * 2. Docker Compose configuration
 * 3. Terraform infrastructure scripts
 * 4. Readme and deployment guides
 */
export class EjectSystem {
    private static STORAGE_DIR = path.join(process.cwd(), 'artifact-storage', 'ejects');

    static async eject(missionId: string, projectPath: string): Promise<string> {
        await fs.ensureDir(this.STORAGE_DIR);
        const ejectPath = path.join(this.STORAGE_DIR, `${missionId}.zip`);
        
        const output = fs.createWriteStream(ejectPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise((resolve, reject) => {
            output.on('close', () => {
                logger.info({ missionId, size: archive.pointer() }, '[Eject] Bundle created');
                resolve(ejectPath);
            });
            archive.on('error', (err) => reject(err));

            archive.pipe(output);

            // 1. Add generated source
            archive.directory(projectPath, 'src');

            // 2. Add Infrastructure templates
            const infraDir = path.join(process.cwd(), 'infrastructure');
            archive.directory(path.join(infraDir, 'docker'), 'infrastructure/docker');
            archive.directory(path.join(infraDir, 'terraform'), 'infrastructure/terraform');

            // 3. Add generated README
            archive.append(`
# Aion Generated Project: ${missionId}

## Deployment
1. Run \`docker-compose up --build\` in \`infrastructure/docker\`
2. Apply terraform scripts in \`infrastructure/terraform\`
            `, { name: 'README.md' });

            archive.finalize();
        });
    }
}
