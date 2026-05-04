/**
 * MultiAgent Cost Auditor
 * Scans the brain directory for LLM call patterns and estimates costs.
 */
const fs = require('fs');
const path = require('path');

const BRAIN_DIR = path.resolve(__dirname, '..', 'packages', 'brain', 'src');
const PRICING_TIERS = [2000, 4000, 8000]; // INR

function auditFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const prompts = (content.match(/promptLLM/g) || []).length;
    const cacheChecks = (content.match(/SemanticCacheService/g) || []).length;
    
    return {
        file: path.basename(filePath),
        prompts,
        cacheChecks
    };
}

const files = fs.readdirSync(BRAIN_DIR).filter(f => f.endsWith('.ts'));
const audit = files.map(f => auditFile(path.join(BRAIN_DIR, f)));

const totalPrompts = audit.reduce((acc, f) => acc + f.prompts, 0);

// Heuristics
const AVG_TOKENS_PER_PROMPT = 1500; // 500 input, 1000 output
const COST_PER_1K_TOKENS = 0.0001; // Groq Llama 3.3 70b approx

const costPerBuild = (totalPrompts * AVG_TOKENS_PER_PROMPT / 1000) * COST_PER_1K_TOKENS;

console.log('\n--- MultiAgent FinOps Audit ---');
console.log(`Total Agents Scanned: ${files.length}`);
console.log(`Estimated Prompts per Workflow: ~${totalPrompts}`);
console.log(`Estimated Cost per Full Build: $${costPerBuild.toFixed(4)}`);

PRICING_TIERS.forEach(tier => {
    const revenueUSD = tier / 84; // Approx INR to USD
    const margin = ((revenueUSD - (costPerBuild * 10)) / revenueUSD) * 100; // Assuming 10 builds per user/mo
    console.log(`Tier ₹${tier} | Projected Gross Margin: ${margin.toFixed(2)}%`);
});

fs.writeFileSync(path.join(__dirname, '..', 'cost_audit_results.json'), JSON.stringify({
    audit,
    summary: {
        totalPrompts,
        costPerBuild,
        margins: PRICING_TIERS.map(tier => ({ tier, margin: ((tier/84 - (costPerBuild * 10)) / (tier/84)) * 100 }))
    }
}, null, 2));
