import { LlmService } from '@packages/utils';
import { env } from '@packages/config';

async function main() {
    console.log('🔍 Verifying LLM Connectivity...');
    console.log(`Provider: ${env.LLM_PROVIDER}`);
    console.log(`Model: ${env.DEFAULT_LLM_MODEL}`);

    const llm = new LlmService();
    
    try {
        const response = await llm.chat([
            { role: 'user', content: 'Say hello world in 3 words.' }
        ]);

        console.log('✅ LLM Response Received:');
        console.log(response);
    } catch (err) {
        console.error('❌ LLM Connection Failed:');
        console.error(err);
        process.exit(1);
    }
}

main();
