async function trigger() {
    const port = process.argv[2] || '4482';
    console.log(`🚀 [SMOKE TEST] Triggering mission at http://localhost:${port}/generate...`);

    const payload = {
        prompt: "Create a simple landing page with a contact form using HTML and standard CSS. Use a modern, light-themed aesthetic with a clean header and a footer. The contact form should have name, email, and message fields."
    };

    try {
        const response = await fetch(`http://localhost:${port}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (response.ok) {
            console.log(`✅ [SMOKE TEST] Mission Triggered Successfully! MissionID: ${data.missionId}`);
        } else {
            console.error(`❌ [SMOKE TEST] Trigger Failed:`, data);
            process.exit(1);
        }
    } catch (err) {
        console.error(`❌ [SMOKE TEST] Trigger Failed:`, err.message);
        process.exit(1);
    }
}

trigger();
