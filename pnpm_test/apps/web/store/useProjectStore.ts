import { create } from 'zustand';

export type BuildStepId =
  | 'idle'
  | 'planning'
  | 'generating'
  | 'fixing'
  | 'deploying'
  | 'complete'
  | 'error';

interface ProjectState {
  status: BuildStepId;
  previewUrl: string | null;
  buildId: string | null;
  logs: string[];
  agentActivity: Record<string, unknown>[];
  setStatus: (status: BuildStepId) => void;
  setPreviewUrl: (url: string) => void;
  setBuildId: (id: string) => void;
  addLog: (log: string) => void;
  addActivity: (activity: Record<string, unknown>) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  status: 'idle',
  previewUrl: null,
  buildId: null,
  logs: [],
  agentActivity: [],
  setStatus: (status) => set({ status }),
  setPreviewUrl: (url) => set({ previewUrl: url }),
  setBuildId: (id) => set({ buildId: id }),
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  addActivity: (activity) => set((state) => ({ agentActivity: [...state.agentActivity, activity] })),
}));
