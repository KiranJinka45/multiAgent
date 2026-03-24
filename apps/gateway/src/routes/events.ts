import { Request, Response } from 'express';
import { db } from '@libs/db';

export const trackEvent = async (req: Request, res: Response) => {
  const { type, metadata } = req.body;
  const authReq = req as Request & { user?: { id: string; tenantId: string } };
  const userId = authReq.user?.id || null;
  const tenantId = authReq.user?.tenantId || null;

  try {
    await db.event.create({
      data: {
        type,
        metadata: metadata || {},
        userId,
        tenantId,
      },
    });
    res.json({ success: true });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Failed to track event', details: err });
  }
};
