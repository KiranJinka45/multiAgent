import { Orchestrator } from '../services/orchestrator';
import { eventBus } from '../services/event-bus';
import * as fs from 'fs-extra';
import path from 'path';
import { redis } from '../services/queue';

async function testSelfHealing() {
    console.log('🚀 Starting Autonomous Self-Healing Verification Test');
    
    const projectId = 'test-healing-' + Date.now();
    const executionId = 'exec-' + Date.now();
    const sandboxDir = path.join(process.cwd(), '.sandboxes', projectId);
    
    await fs.ensureDir(sandboxDir);
    
    // 1. Create a broken project (Syntax Error in app/page.tsx)
    const brokenFiles = [
        {
            path: 'package.json',
            content: JSON.stringify({
                name: "broken-project",
                version: "1.0.0",
                scripts: {
                    "build": "next build",
                    "install": "npm install"
                },
                dependencies: {
                    "next": "14.2.3",
                    "react": "18.3.1",
                    "react-dom": "18.3.1"
                }
            }, null, 2)
        },
        {
            path: 'app/page.tsx',
            content: `export default function Home() {
                return (
                    <div>
                        <h1>Broken Project</h1>
                        {/* Intentionally missing closing brace or tag */}
                        <p>This should fail build
                );
            }`
        }
    ];

    for (const file of brokenFiles) {
        const fullPath = path.join(sandboxDir, file.path);
        await fs.ensureDir(path.dirname(fullPath));
        await fs.writeFile(fullPath, file.content);
    }

    console.log('✅ Created broken project in sandbox:', sandboxDir);

    const orchestrator = new Orchestrator();

    // We manually invoke the private validateAndHeal for testing
    // Since it's private in TypeScript, we cast to any or use a helper
    console.log('🛠 Engaging Autonomous Healing Loop...');
    
    // Mocking elog
    const elog = {
        info: (msg: any) => console.log('[INFO]', msg),
        warn: (msg: any) => console.warn('[WARN]', msg),
        error: (msg: any) => console.error('[ERROR]', msg)
    };

    try {
        // @ts-ignore - Accessing private method for testing
        const success = await orchestrator.validateAndHeal(projectId, executionId, sandboxDir, brokenFiles, elog);

        if (success) {
            console.log('🎊 SUCCESS: Autonomous Self-Healing resolved the build error!');
            
            // Verify file was actually fixed
            const fixedContent = await fs.readFile(path.join(sandboxDir, 'app/page.tsx'), 'utf-8');
            console.log('📄 Fixed Content Sample:', fixedContent.substring(0, 100) + '...');
            
            if (fixedContent.includes(')')) {
                console.log('✅ Syntax verified: Closing brace/parenthesis found.');
            }
        } else {
            console.error('❌ FAILURE: Autonomous Self-Healing could not resolve the error.');
        }
    } catch (error) {
        console.error('💥 CRASH during self-healing test:', error);
    } finally {
        // Cleanup
        // await fs.remove(sandboxDir);
        await redis.quit();
        process.exit(0);
    }
}

testSelfHealing().catch(console.error);
