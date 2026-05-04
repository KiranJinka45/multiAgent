import { db } from '@packages/db';

async function main() {
    const project = await db.project.findFirst();
    console.log('Project ID:', project?.id);
}

main().then(() => process.exit(0));
