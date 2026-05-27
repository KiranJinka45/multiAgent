import { InstitutionalPilotRegistry } from './index.js';
import * as fs from 'fs';
import * as path from 'path';

// Simple lightweight assertion helper
function assert(condition: any, message: string) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        throw new Error(message);
    } else {
        console.log(`✅ PASSED: ${message}`);
    }
}

async function runAllTests() {
    const REGISTRY_PATH = path.join(process.cwd(), '.ztan', 'pilot-registry.json');

    const cleanRegistry = () => {
        if (fs.existsSync(REGISTRY_PATH)) {
            fs.unlinkSync(REGISTRY_PATH);
        }
    };

    console.log('\n==================================================');
    console.log('🚀 INITIATING PRODUCTION PILOT INTEGRATION TEST SUITE');
    console.log('==================================================\n');

    try {
        // Test 1: Register and persist
        console.log('👉 Running Test 1: Register new pilot and persist...');
        cleanRegistry();
        const name = 'Global Research Univ';
        const type = 'UNIVERSITY';
        const pilot = InstitutionalPilotRegistry.registerPilot(name, type);

        assert(pilot.name === name, 'Pilot name must match');
        assert(pilot.type === type, 'Pilot type must match');
        assert(/^PILOT-/.test(pilot.id), 'Pilot ID must start with PILOT-');
        assert(pilot.status === 'ACTIVE', 'Pilot status must be ACTIVE');

        const pilots = InstitutionalPilotRegistry.listPilots();
        assert(pilots.length === 1, 'Pilots list must contain 1 pilot');
        assert(pilots[0].id === pilot.id, 'Pilot ID in list must match');
        assert(fs.existsSync(REGISTRY_PATH), 'Registry file must exist');

        // Test 2: Retrieve by ID
        console.log('\n👉 Running Test 2: Retrieve pilot by ID...');
        cleanRegistry();
        const pilot2 = InstitutionalPilotRegistry.registerPilot('Sandbox A', 'SANDBOX');
        const retrieved = InstitutionalPilotRegistry.getPilot(pilot2.id);
        assert(retrieved !== undefined, 'Retrieved pilot must not be undefined');
        assert(retrieved?.id === pilot2.id, 'Retrieved pilot ID must match');
        assert(retrieved?.name === 'Sandbox A', 'Retrieved pilot name must match');

        // Test 3: Associate cell
        console.log('\n👉 Running Test 3: Associate cell with pilot...');
        cleanRegistry();
        const pilot3 = InstitutionalPilotRegistry.registerPilot('Fintech X', 'FINTECH');
        const cellId = 'CELL-123';
        InstitutionalPilotRegistry.associateCell(pilot3.id, cellId);

        const updated = InstitutionalPilotRegistry.getPilot(pilot3.id);
        assert(updated?.associatedCells.includes(cellId), 'Associated cells must contain the cell ID');

        // Test 4: Exception handling
        console.log('\n👉 Running Test 4: Throw error when cell associated with non-existent pilot...');
        let threwError = false;
        try {
            InstitutionalPilotRegistry.associateCell('NON-EXISTENT', 'CELL-123');
        } catch (err: any) {
            threwError = true;
            assert(err.message === 'Pilot NON-EXISTENT not found', 'Error message must match');
        }
        assert(threwError, 'Should throw error for non-existent pilot');

        console.log('\n==================================================');
        console.log('🎉 ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY!');
        console.log('==================================================\n');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ TEST RUN ENCOUNTERED FAILURE:\n', error);
        process.exit(1);
    }
}

runAllTests();
