import { InstitutionalPilotRegistry } from './src/index.ts';
import * as fs from 'fs';
import * as path from 'path';

async function test() {
    const REGISTRY_PATH = path.join(process.cwd(), '.ztan', 'pilot-registry.json');
    if (fs.existsSync(REGISTRY_PATH)) fs.unlinkSync(REGISTRY_PATH);

    console.log('Testing Pilot Registration...');
    const pilot = InstitutionalPilotRegistry.registerPilot('Test University', 'UNIVERSITY');
    console.log('Registered Pilot:', pilot.id, pilot.name);

    console.log('Testing Pilot Listing...');
    const pilots = InstitutionalPilotRegistry.listPilots();
    console.log('Pilots count:', pilots.length);

    console.log('Testing Cell Association...');
    InstitutionalPilotRegistry.associateCell(pilot.id, 'CELL-TEST-123');
    const updated = InstitutionalPilotRegistry.getPilot(pilot.id);
    console.log('Associated Cells:', updated?.associatedCells);

    if (updated?.associatedCells.includes('CELL-TEST-123')) {
        console.log('✅ Manual Verification PASSED');
    } else {
        console.log('❌ Manual Verification FAILED');
        process.exit(1);
    }
}

test().catch(err => {
    console.error(err);
    process.exit(1);
});
