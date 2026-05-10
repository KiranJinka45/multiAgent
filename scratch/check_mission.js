
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const missionId = 'ccf8c0fb-2cbe-4572-a85c-eadcf4836cd1';
    const mission = await prisma.mission.findUnique({ where: { id: missionId } });
    console.log(JSON.stringify(mission, null, 2));
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
