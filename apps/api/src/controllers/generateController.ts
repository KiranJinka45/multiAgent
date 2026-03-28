import { Request, Response } from 'express';
import { buildQueue } from '@packages/queue';
import { logger } from '@packages/observability';

export const generateApp = async (req: Request, res: Response) => {
  let { prompt, structuredData } = req.body;

  if (structuredData) {
    prompt = `Build a ${structuredData.vibe} ${structuredData.type}. Key features: ${structuredData.features?.join(', ')}. Goal: ${structuredData.customGoal}`;
  }

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const missionId = `mission_${Date.now()}`;
  logger.info({ 
    missionId, 
    prompt, 
    source: structuredData ? 'structured_form' : 'raw_prompt',
    timestamp: Date.now() 
  }, '[ANALYTICS] Generation Started');

  await buildQueue.add('build:init', {
    missionId,
    prompt,
  });

  res.json({ missionId });
};
