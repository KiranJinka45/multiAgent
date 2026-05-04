import { redis } from '@packages/utils';
import { logger } from '@packages/observability';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from './notification-service';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface ApprovalRequest {
  id: string;
  createdAt: number;
  expiresAt: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  trustScore: number;
  
  // Decision Context
  proposedAction: any;
  predictedImpact: number;
  rootCauses: { nodeId: string; confidence: number }[];
  
  // Safety
  blastRadius: number;
  targetServices: string[];
  
  // Explainability
  reasoning: string;
  
  status: ApprovalStatus;
  decidedBy?: string;
  decisionReason?: string;
}

export class ApprovalService {
  private static KEY_PREFIX = 'sre:approval:';
  private static LIST_KEY = 'sre:approval:active';

  public static async createRequest(params: Omit<ApprovalRequest, 'id' | 'createdAt' | 'status'>): Promise<ApprovalRequest> {
    const id = uuidv4();
    const req: ApprovalRequest = {
      ...params,
      id,
      createdAt: Date.now(),
      status: 'PENDING'
    };

    await redis.set(`${this.KEY_PREFIX}${id}`, JSON.stringify(req), 'PX', params.expiresAt - Date.now());
    await redis.lpush(this.LIST_KEY, id);
    
    logger.info({ requestId: id, proposedAction: params.proposedAction.type, trustScore: params.trustScore }, '[APPROVAL] New request created');
    
    // Trigger External Notification
    await NotificationService.notifyApprovalRequired(id, params.proposedAction.type, params.trustScore);
    
    return req;
  }

  public static async getRequest(id: string): Promise<ApprovalRequest | null> {
    const data = await redis.get(`${this.KEY_PREFIX}${id}`);
    return data ? JSON.parse(data) : null;
  }

  public static async approve(id: string, user: string, reason?: string): Promise<ApprovalRequest | null> {
    const req = await this.getRequest(id);
    if (!req || req.status !== 'PENDING') return null;

    req.status = 'APPROVED';
    req.decidedBy = user;
    req.decisionReason = reason;

    await redis.set(`${this.KEY_PREFIX}${id}`, JSON.stringify(req));
    logger.info({ requestId: id, user }, '[APPROVAL] Request approved');
    return req;
  }

  public static async reject(id: string, user: string, reason?: string): Promise<ApprovalRequest | null> {
    const req = await this.getRequest(id);
    if (!req || req.status !== 'PENDING') return null;

    req.status = 'REJECTED';
    req.decidedBy = user;
    req.decisionReason = reason;

    await redis.set(`${this.KEY_PREFIX}${id}`, JSON.stringify(req));
    logger.warn({ requestId: id, user, reason }, '[APPROVAL] Request rejected');
    return req;
  }

  public static async getActiveRequests(): Promise<ApprovalRequest[]> {
    const ids = await redis.lrange(this.LIST_KEY, 0, -1);
    const requests = await Promise.all(ids.map(id => this.getRequest(id)));
    return requests.filter((r): r is ApprovalRequest => r !== null && r.status === 'PENDING');
  }
}
