import { Request, Response } from 'express';
import { redis } from '@packages/utils';
import { ProjectV1, ProjectHistoryV1, ProjectStatus } from '@packages/contracts';

const PROJECT_PREFIX = 'project:';
const USER_PROJECTS_PREFIX = 'user_projects:';

export const projectController = {
  async list(req: Request, res: Response) {
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const keys = await redis.smembers(`${USER_PROJECTS_PREFIX}${userId}`);
    
    const projects: ProjectV1[] = [];
    for (const key of keys) {
      const data = await redis.get(`${PROJECT_PREFIX}${key}`);
      if (data) projects.push(JSON.parse(data));
    }
    
    res.json(projects);
  },

  async get(req: Request, res: Response) {
    const { projectId } = req.params;
    const data = await redis.get(`${PROJECT_PREFIX}${projectId}`);
    
    if (!data) return res.status(404).json({ error: 'Project not found' });
    
    const project = JSON.parse(data);
    const historyData = await redis.lrange(`project_history:${projectId}`, 0, -1);
    const history = historyData.map(h => JSON.parse(h));
    
    res.json({ ...project, history });
  },

  async create(req: Request, res: Response) {
    const { name, missionId, prompt } = req.body;
    const userId = req.headers['x-user-id'] as string || 'default-user';
    
    if (!name || !missionId) return res.status(400).json({ error: 'Name and missionId are required' });

    const projectId = `p_${Math.random().toString(36).slice(2, 10)}`;
    const project: ProjectV1 = {
      id: projectId,
      name,
      userId,
      missionId,
      status: ProjectStatus.ACTIVE,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const historyItem: ProjectHistoryV1 = {
      id: `v_${Date.now()}`,
      projectId,
      missionId,
      prompt: prompt || 'Initial generation',
      createdAt: Date.now()
    };

    await redis.set(`${PROJECT_PREFIX}${projectId}`, JSON.stringify(project));
    await redis.sadd(`${USER_PROJECTS_PREFIX}${userId}`, projectId);
    await redis.lpush(`project_history:${projectId}`, JSON.stringify(historyItem));

    res.json(project);
  },

  async restore(req: Request, res: Response) {
    const { projectId, versionId } = req.params;
    const historyData = await redis.lrange(`project_history:${projectId}`, 0, -1);
    const history = historyData.map(h => JSON.parse(h)) as ProjectHistoryV1[];
    
    const version = history.find(v => v.id === versionId);
    if (!version) return res.status(404).json({ error: 'Version not found' });

    const data = await redis.get(`${PROJECT_PREFIX}${projectId}`);
    if (!data) return res.status(404).json({ error: 'Project not found' });

    const project = JSON.parse(data) as ProjectV1;
    project.missionId = version.missionId;
    project.updatedAt = Date.now();

    await redis.set(`${PROJECT_PREFIX}${projectId}`, JSON.stringify(project));
    res.json({ success: true, project });
  }
};

