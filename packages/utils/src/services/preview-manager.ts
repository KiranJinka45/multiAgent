import { prisma } from '@libs/db';
import { logger } from '../logger';

export class PreviewManager {
    static async generatePreviewUrl(buildId: string): Promise<string> {
        // In a production K8s environment, this would involve creating an Ingress/Service
        // For now, we generate a persistent deterministic URL
        const previewUrl = `https://preview-${buildId.slice(0, 8)}.multiagent.app`;
        
        logger.info({ buildId, previewUrl }, '[PreviewManager] Generated preview URL');

        try {
            await prisma.build.update({
                where: { id: buildId },
                data: { previewUrl }
            });
        } catch (err: unknown) {
            logger.error({ err }, '[PreviewManager] Failed to update build with preview URL');
        }

        return previewUrl;
    }
}
