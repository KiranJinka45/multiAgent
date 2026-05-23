import { InstitutionalPilotRegistry, type PilotMetadata } from './index.js';
import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('InstitutionalPilotRegistry', () => {
    const REGISTRY_PATH = path.join(process.cwd(), '.ztan', 'pilot-registry.json');

    beforeEach(() => {
        if (fs.existsSync(REGISTRY_PATH)) {
            fs.unlinkSync(REGISTRY_PATH);
        }
    });

    afterEach(() => {
        if (fs.existsSync(REGISTRY_PATH)) {
            fs.unlinkSync(REGISTRY_PATH);
        }
    });

    it('should register a new pilot and persist it', () => {
        const name = 'Global Research Univ';
        const type = 'UNIVERSITY';
        const pilot = InstitutionalPilotRegistry.registerPilot(name, type);

        expect(pilot.name).toBe(name);
        expect(pilot.type).toBe(type);
        expect(pilot.id).toMatch(/^PILOT-/);
        expect(pilot.status).toBe('ACTIVE');

        const pilots = InstitutionalPilotRegistry.listPilots();
        expect(pilots.length).toBe(1);
        expect(pilots[0].id).toBe(pilot.id);
        expect(fs.existsSync(REGISTRY_PATH)).toBe(true);
    });

    it('should retrieve a pilot by ID', () => {
        const pilot = InstitutionalPilotRegistry.registerPilot('Sandbox A', 'SANDBOX');
        const retrieved = InstitutionalPilotRegistry.getPilot(pilot.id);
        expect(retrieved).toEqual(pilot);
    });

    it('should associate a cell with a pilot', () => {
        const pilot = InstitutionalPilotRegistry.registerPilot('Fintech X', 'FINTECH');
        const cellId = 'CELL-123';
        InstitutionalPilotRegistry.associateCell(pilot.id, cellId);

        const updated = InstitutionalPilotRegistry.getPilot(pilot.id);
        expect(updated?.associatedCells).toContain(cellId);
    });

    it('should throw error when associating cell with non-existent pilot', () => {
        expect(() => {
            InstitutionalPilotRegistry.associateCell('NON-EXISTENT', 'CELL-123');
        }).toThrow('Pilot NON-EXISTENT not found');
    });
});
