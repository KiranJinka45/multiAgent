import { db } from './packages/db/src';

async function checkFeedback() {
    const feedback = await db.betaFeedback.findMany();
    console.log('--- BETA FEEDBACK ENTRIES ---');
    feedback.forEach(f => {
        console.log(`[${f.type}] Status: ${f.status} | Content: ${f.content}`);
    });
    await db.$disconnect();
}

checkFeedback();
