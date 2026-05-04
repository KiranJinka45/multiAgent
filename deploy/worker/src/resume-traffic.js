"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const utils_1 = require("@packages/utils");
const observability_1 = require("@packages/observability");
/**
 * ResumeTrafficFleet
 *
 * Triggers organic traffic generation for the AI Resume Optimizer.
 */
async function triggerSeoFleet() {
    const roles = [
        'Software Engineer', 'Product Manager', 'Data Scientist',
        'Sales Representative', 'Marketing Manager', 'Nurse',
        'Teacher', 'Graphic Designer', 'Customer Support',
        'Accountant', 'Project Manager', 'Mechanical Engineer'
    ];
    for (const role of roles) {
        observability_1.logger.info({ role }, '[ResumeTrafficFleet] Generating SEO pages');
        await utils_1.QueueManager.add('agent-task', {
            agent: 'ProgrammaticSeoAgent',
            input: {
                niche: `Resume for ${role}`,
                keywords: [`${role} resume optimizer`, `${role} cv tips`, `best resume for ${role}`]
            },
            context: { executionId: `seo-resume-${Date.now()}` }
        });
    }
    observability_1.logger.info('[ResumeTrafficFleet] Social distribution starting...');
    await utils_1.QueueManager.add('agent-task', {
        agent: 'SocialAgent',
        input: {
            platform: 'twitter',
            topic: 'How to fix your resume in 30 seconds with AI',
            productLink: 'https://multiagent.app/resume'
        }
    });
}
triggerSeoFleet().catch(console.error);
//# sourceMappingURL=resume-traffic.js.map