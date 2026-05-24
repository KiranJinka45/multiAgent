export class IntentDetectionAgent {
    async execute(payload: any, ctx: any) {
        return {
            success: true,
            data: {
                templateId: payload.context?.techStack || 'nextjs'
            }
        };
    }
}

export class GeneratorAgent {
    async execute(payload: any, ctx: any) {
        return {
            success: true,
            data: {
                files: [
                    { path: 'src/app/page.tsx', content: 'export default function Page() { return <div>Aion Web App</div>; }' },
                    { path: 'package.json', content: '{"name": "test-app", "dependencies": {}}' }
                ]
            }
        };
    }
}

export class RepairAgent {
    async execute(payload: any, ctx: any) {
        return {
            success: true,
            data: {
                patches: []
            }
        };
    }
}

export class MetaAgent {
    async execute(payload: any, ctx: any) {
        return {
            success: true,
            data: {
                recommendedTechStack: 'nextjs'
            }
        };
    }
}

export const AgentMemory = {
    set: async (missionId: string, key: string, value: any) => {},
    appendTranscript: async (missionId: string, name: string, text: string) => {}
};
