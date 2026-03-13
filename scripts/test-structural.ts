import axios from 'axios';
import 'dotenv/config';

const NEXT_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testStructuralGeneration() {
    console.log("=== MultiAgent Structural Generation Test ===");
    
    const testProjectId = '550e8400-e29b-41d4-a716-446655440000'; 
    const testExecutionId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    
    const payload = {
        projectId: testProjectId,
        executionId: testExecutionId,
        prompt: "Build a luxury coffee shop landing page with a minimalist white theme, a premium hero section, and a testimonials grid.",
        isChaosTest: true
    };

    console.log(`Triggering mission for project: ${testProjectId}...`);
    
    try {
        const res = await axios.post(`${NEXT_URL}/api/build`, payload);
        console.log(`Mission Triggered: ${res.data.executionId}`);
        console.log(`\nView progress here: ${NEXT_URL}/build/${res.data.executionId}`);
        
        console.log("\nWAITING FOR GENERATION (approx 45s)...");
        // We'll trust the Orchestrator logs for verification since we can't easily wait here
    } catch (error) {
        console.error("Failed to trigger mission:", error.response?.data || error.message);
    }
}

testStructuralGeneration();
