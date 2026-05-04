export type GithubRepo = {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    description: string | null;
    updated_at: string;
    stargazers_count: number;
    forks_count: number;
    language: string | null;
};

export const githubService = {
    isConnected: async () => false,
    connect: async () => {
        // Mock connection for now
        return true;
    },
    getRepositories: async (): Promise<GithubRepo[]> => [],
    createRepository: async (name: string, isPrivate: boolean) => {
        return { success: true, url: `https://github.com/mock/${name}` };
    },
    pushProject: async (projectId: string, repoName: string, isPrivate: boolean) => {
        return { success: true, url: `https://github.com/mock/${repoName}` };
    }
};

