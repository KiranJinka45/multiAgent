export interface ProjectV1 {
  id: string;
  name: string;
  userId: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  productionUrl?: string;
  missionId: string; // Latest successful mission
}

export interface ProjectHistoryV1 {
  id: string;
  projectId: string;
  missionId: string;
  prompt: string;
  createdAt: number;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  path: string;
  content: string;
  language?: string;
}
