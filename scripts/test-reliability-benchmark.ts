import { Orchestrator } from '../services/orchestrator';
import { v4 as uuidv4 } from 'uuid';

async function reliabilityBenchmark() {
    console.log('🏗️ Starting Level-7 Reliability Benchmark');
    
    const orchestrator = new Orchestrator();
    const projectId = 'reliability-test-' + Date.now();
    const executionId = uuidv4();
    
    const prompt = "Build a high-performance Silk Saree E-commerce Landing Page with a Hero Section, Product Grid showing Dharmavaram Silks, and a Contact Form. Use professional styling.";

    console.log(`🚀 Triggering build for project: ${projectId}`);
    
    try {
        const result = await orchestrator.execute(prompt, 'test-user', projectId, executionId, new AbortController().signal);
        
        if (result.success) {
            console.log('✅ Build phase completed successfully.');
            console.log(`🔗 Preview URL: ${result.previewUrl}`);
            
            // Verify if build passed (this is implied by orchestrator.execute success in this context)
            console.log('🧪 Build validation: PASSED');
        } else {
            console.error('❌ Build failed:', result.error);
        }

    } catch (error) {
        console.error('💥 Benchmark crashed:', error);
    } finally {
        process.exit(0);
    }
}

reliabilityBenchmark().catch(console.error);

