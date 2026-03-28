import { Request, Response } from 'express';
import { missionController } from '@packages/utils/server';

export const getStatus = async (req: Request, res: Response) => {
  const missionId = req.params.missionId as string;

  const mission = await missionController.getMission(missionId);

  if (!mission) {
    return res.status(404).json({ error: 'Mission not found' });
  }

  res.json(mission);
};
