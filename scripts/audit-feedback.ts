import { db } from '../packages/db/src';

async function auditFeedback() {
    console.log('💬 AUDITING QUALITATIVE FEEDBACK (DAY 4)...');

    const feedback = await db.betaFeedback.findMany({
        orderBy: { createdAt: 'desc' }
    });

    if (feedback.length === 0) {
        console.log('⚪ No feedback submitted yet.');
        await db.$disconnect();
        return;
    }

    const stats = {
        total: feedback.length,
        issues: feedback.filter(f => f.type === 'ISSUE').length,
        improvements: feedback.filter(f => f.type === 'IMPROVEMENT').length
    };

    console.log(`\n📊 FEEDBACK SUMMARY:`);
    console.log(`  Total Submissions: ${stats.total}`);
    console.log(`  Critical Issues:   ${stats.issues}`);
    console.log(`  Feature Requests:  ${stats.improvements}`);

    console.log('\n📝 RECENT ENTRIES:');
    feedback.forEach(f => {
        const typeEmoji = f.type === 'ISSUE' ? '🚨' : '💡';
        console.log(`  ${typeEmoji} [${f.status.toUpperCase()}] ${f.content}`);
    });

    // Pattern Recognition (Simple Mock Logic)
    const mentions = {
        onboarding: feedback.filter(f => f.content.toLowerCase().includes('slow') || f.content.toLowerCase().includes('onboarding')).length,
        pricing: feedback.filter(f => f.content.toLowerCase().includes('price') || f.content.toLowerCase().includes('cost')).length,
        ui: feedback.filter(f => f.content.toLowerCase().includes('ui') || f.content.toLowerCase().includes('look')).length
    };

    console.log('\n🧠 PATTERN RECOGNITION:');
    if (mentions.onboarding > 0) console.log(`  ⚠️  ONBOARDING FRICTION: ${mentions.onboarding} mentions of slow setup/start.`);
    if (mentions.pricing > 0) console.log(`  💰 PRICING CLARITY: ${mentions.pricing} mentions of cost concerns.`);
    if (mentions.ui > 0) console.log(`  🎨 UI POLISH: ${mentions.ui} mentions of interface improvements.`);

    console.log('\n' + '═'.repeat(40));
    console.log('🏁 DAY 4 FEEDBACK REPORT');
    console.log('═'.repeat(40));
    console.log(`🏆 #1 Confusion Point: ${mentions.onboarding > 0 ? 'Onboarding Speed' : 'N/A'}`);
    console.log(`✅ Triaged for Sprint: ${stats.issues}`);
    console.log('═'.repeat(40));

    await db.$disconnect();
}

auditFeedback();
