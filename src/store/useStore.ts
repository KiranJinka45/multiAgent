import { create } from 'zustand';
import { ExecutionContextType } from '@/lib/execution-context';

interface AppState {
    currentProjectId: string | null;
    isGenerating: boolean;
    executionContext: ExecutionContextType | null;
    logs: string[];
    generatedFiles: any[];

    // Actions
    setProject: (projectId: string) => void;
    startGeneration: () => void;
    finishGeneration: (context: ExecutionContextType, files: any[]) => void;
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

    finishGeneration: (context, files) => set({
        isGenerating: false,
        executionContext: context,
        generatedFiles: files,
        logs: (prev) => [...prev, '[System] Build completed successfully.']
    }),

    failGeneration: (error) => set({
        isGenerating: false,
        logs: (prev) => [...prev, `[Error] ${error}`]
    }),

    addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),

    reset: () => set({
        isGenerating: false,
        executionContext: null,
        logs: [],
        generatedFiles: []
    })
}));
