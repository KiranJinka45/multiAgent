import { db } from '../packages/db/src';

async function mockSession() {
    const alice = await db.user.findUnique({ where: { email: 'alice@example.com' } });
    if (alice) {
        await db.userSession.create({
            data: {
                userId: alice.id,
                tokenHash: 'mock-token-' + Date.now(),
                expiresAt: new Date(Date.now() + 86400000),
                createdAt: new Date(Date.now() - 600000) // 10 mins ago
            }
        });
        console.log('✅ Mock session for Alice created.');
    }
    await db.$disconnect();
}

mockSession();
