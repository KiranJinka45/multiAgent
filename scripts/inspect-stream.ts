import Redis from 'ioredis';

const redis = new Redis('redis://localhost:6379');

async function inspectStream() {
    try {
        const streamKey = 'build:stream:exec-1773652493109';
        const entries = await redis.xrange(streamKey, '-', '+');
        
        if (!entries || entries.length === 0) {
            console.log('Stream not found or empty.');
            return;
        }

        console.log(`Total events in stream: ${entries.length}`);

        console.log('Sample raw stream entry format:');
        console.log(JSON.stringify(entries[0], null, 2));

        const allParsed = [];
        for (const [id, fields] of entries) {
            let data = {};
            for (let i = 0; i < fields.length; i += 2) {
                data[fields[i]] = fields[i + 1];
            }
            
            // Try parsing generic payload field
            if (data.payload) {
                try { allParsed.push(JSON.parse(data.payload)); } catch(e) {}
            } else if (data.data) {
                try { allParsed.push(JSON.parse(data.data)); } catch(e) {}
            } else {
                allParsed.push(data); // Push raw
            }
        }

        console.log('--- Sample Parsed Events ---');
        allParsed.slice(0, 5).forEach((e, i) => console.log(`[${i}] type: ${e.type || 'unknown'} - path: ${e.path || e.metadata?.path || 'none'} - message: ${e.message?.substring(0, 30)}`));

        const packageJsonEvent = allParsed.find(e => 
            e.path === 'package.json' || 
            e.metadata?.path === 'package.json' ||
            JSON.stringify(e).includes('package.json')
        );
        
        if (packageJsonEvent) {
            console.log('\nFOUND package.json event:');
            console.log(JSON.stringify(packageJsonEvent).substring(0, 500) + '...');
        } else {
            console.log('\nNO package.json found in stream events.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await redis.quit();
        process.exit(0);
    }
}

inspectStream();
