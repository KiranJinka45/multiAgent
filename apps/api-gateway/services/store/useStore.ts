import { create } from 'zustand';
import { AgentResult, ExecutionContextType } from '@services/execution-context';
import { ProjectFile } from '@shared-types/project';

interface AppState {
    currentProjectId: string | null;
    isGenerating: boolean;
    executionContext: ExecutionContextType | null;
    logs: string[];
    generatedFiles: ProjectFile[];

    // Actions
    setProject: (projectId: string) => void;
    startGeneration: () => void;
    finishGeneration: (context: ExecutionContextType, files: ProjectFile[]) => void;
    failGeneration: (error: string) => void;
    addLog: (log: string) => void;
    reset: () => void;
}

export const useStore = create<AppState>((set) => ({
    currentProjectId: null,
    isGenerating: false,
    executionContext: null,
    logs: [],
    generatedFiles: [],

    setProject: (projectId) => set({ currentProjectId: projectId }),

    startGeneration: () => set({
        isGenerating: true,
        logs: ['[System] Initializing generation engine...']
    }),

    finishGeneration: (context, files) => set((state) => ({
        isGenerating: false,
        executionContext: context,
        generatedFiles: files,
        logs: [...state.logs, '[System] Build completed successfully.']
    })),

    failGeneration: (error) => set((state) => ({
        isGenerating: false,
        logs: [...state.logs, `[Error] ${error}`]
    })),

    addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),

    reset: () => set({
        isGenerating: false,
        executionContext: null,
        logs: [],
        generatedFiles: []
    })
}));
