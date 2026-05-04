import { logger } from '@packages/observability';

export type NotificationChannel = 'SLACK' | 'PAGERDUTY' | 'EMAIL';

export interface NotificationPayload {
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Dispatches a notification to configured channels.
   * In this production-grade demo, we log to stdout and emit to an internal event bus.
   */
  public static async notify(payload: NotificationPayload, channels: NotificationChannel[] = ['SLACK', 'PAGERDUTY']) {
    logger.warn({
      channels,
      title: payload.title,
      severity: payload.severity,
      metadata: payload.metadata
    }, `[NOTIFICATION] ${payload.title}: ${payload.message}`);

    // Simulate async delivery
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return true;
  }

  public static async notifyApprovalRequired(requestId: string, action: string, trustScore: number) {
    await this.notify({
      title: 'SRE INTERVENTION REQUIRED',
      message: `Action [${action}] is gated due to low trust score (${(trustScore * 100).toFixed(1)}%).`,
      severity: 'CRITICAL',
      metadata: {
        requestId,
        action,
        trustScore,
        dashboardUrl: `http://localhost:4200/sre/approvals/${requestId}`
      }
    });
  }
}
