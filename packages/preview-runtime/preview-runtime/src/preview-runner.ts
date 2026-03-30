import { previewManager } from './preview-manager';
import { logger } from '@packages/utils/server';

export async function previewRunner(projectId: string, files: any[]) {
    logger.info({ projectId }, '[PreviewRunner] Initiating local dev preview...');
    try {
        const url = await previewManager.launchPreview(projectId);
        return {
            success: true,
            url
        };
    } catch (error) {
        logger.error({ error, projectId }, '[PreviewRunner] Failed to launch preview');
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
