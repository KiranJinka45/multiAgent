import pg from 'pg';

async function test() {
    const passwords = ['password', 'postgres'];
    for (const pw of passwords) {
        const config = {
            user: 'postgres',
            password: pw,
            host: '127.0.0.1',
            port: 5433,
            database: 'multiagent'
        };
        console.log(`Testing: postgres:${pw}@127.0.0.1:5433/multiagent`);
        const client = new pg.Client(config);
        try {
            await client.connect();
            console.log(`✅ SUCCESS with password: ${pw}`);
            process.exit(0);
        } catch (err: any) {
            console.log(`❌ FAILED: ${err.message}`);
        } finally {
            await client.end().catch(() => {});
        }
    }
}

test();
