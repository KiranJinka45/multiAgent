import axios from 'axios';
import logger from '../config/logger';

export class RecoveryNotifier {
    private webhookUrl: string | undefined = process.env.ALERTS_WEBHOOK_URL;

    async notifyFailure(executionId: string, error: string): Promise<void> {
        const message = `ðŸš¨ *Build Pipeline Failure* ðŸš¨\n*Execution ID:* ${executionId}\n*Error:* ${error}\n*Timestamp:* ${new Date().toISOString()}`;
        
        logger.error({ executionId, error }, '[RecoveryNotifier] Dispatching alert');

        if (this.webhookUrl) {
            try {
                await axios.post(this.webhookUrl, { text: message });
            } catch (err: any) {
                logger.error({ err }, '[RecoveryNotifier] Failed to send webhook alert');
            }
        }
    }

    async notifySuccess(executionId: string): Promise<void> {
        const message = `âœ… *Build Pipeline Success* âœ…\n*Execution ID:* ${executionId}`;
        
        if (this.webhookUrl) {
            try {
                await axios.post(this.webhookUrl, { text: message });
            } catch (err: any) {
                logger.error({ err }, '[RecoveryNotifier] Failed to send webhook success notification');
            }
        }
    }
}

export const recoveryNotifier = new RecoveryNotifier();
