import { Request, Response } from 'express';
import { buildQueue } from '@packages/queue';
import { missionController } from '@packages/utils/server';

export const updateController = async (req: Request, res: Response) => {
  const { missionId, prompt } = req.body;

  if (!missionId || !prompt) {
    return res.status(400).json({ error: 'missionId and prompt are required' });
  }

  const mission = await missionController.getMission(missionId);
  if (!mission) {
    return res.status(404).json({ error: 'Mission not found' });
  }

  // Enqueue an update job
  const job = await buildQueue.add('build:update', {
    missionId,
    prompt,
    isUpdate: true
  });

  res.json({ missionId, jobId: job.id });
};
