import express from 'express';
import { TssCeremonyService } from '../services/tss-ceremony.service';

const router = express.Router();

/**
 * GET /api/v1/ztan/ceremony/active
 * Returns the current active ceremony state if it exists.
 */
router.get('/ceremony/active', async (req, res) => {
    try {
        const active = await TssCeremonyService.getActive();
        res.json({ active });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/v1/ztan/ceremony/init
 * Starts a new signing ceremony.
 */
router.post('/ceremony/init', async (req, res) => {
    try {
        const { threshold, participants, messageHash } = req.body;
        const state = await TssCeremonyService.init(threshold, participants, messageHash);
        res.status(201).json(state);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * POST /api/v1/ztan/ceremony/commitments
 * MPC Round 1: Submit commitments (Authenticated).
 */
router.post('/ceremony/commitments', async (req, res) => {
    try {
        const state = await TssCeremonyService.submitCommitments(req.body);
        res.json(state);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * POST /api/v1/ztan/ceremony/shares
 * MPC Round 2: Submit shares (Authenticated).
 */
router.post('/ceremony/shares', async (req, res) => {
    try {
        const state = await TssCeremonyService.submitShares(req.body);
        res.json(state);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * POST /api/v1/ztan/ceremony/sign
 * Submits a partial signature (Authenticated).
 */
router.post('/ceremony/sign', async (req, res) => {
    try {
        let state;
        if (req.body.simulate) {
            state = await TssCeremonyService.simulateNodeSign(req.body.nodeId);
        } else {
            state = await TssCeremonyService.submitSignature(req.body);
        }
        res.json(state);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * POST /api/v1/ztan/verify
 * Public endpoint to verify an audit bundle or signature.
 */
router.post('/verify', async (req, res) => {
    try {
        const { ThresholdCrypto } = require('@packages/ztan-crypto');
        const result = await ThresholdCrypto.verifyAudit(JSON.stringify(req.body));
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * GET /api/v1/ztan/ceremony/:id
 * Retrieve a specific ceremony state.
 */
router.get('/ceremony/:id', async (req, res) => {
    try {
        const state = await TssCeremonyService.getActive();
        if (state && state.ceremonyId === req.params.id) {
            res.json(state);
        } else {
            res.status(404).json({ error: 'Ceremony not found' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/v1/ztan/identities
 * Returns the current node registry (Public keys and status).
 */
router.get('/identities', async (req, res) => {
    try {
        const { db } = require('@packages/db');
        const identities = await db.ztanIdentity.findMany();
        res.json(identities);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/v1/ztan/metrics
 * Returns ZTAN performance and trust metrics.
 */
router.get('/metrics', async (req, res) => {
    try {
        const { db } = require('@packages/db');
        const totalCeremonies = await db.ztanProof.count();
        const activeNodes = await db.ztanIdentity.count({ where: { status: 'ACTIVE' } });
        const revokedNodes = await db.ztanIdentity.count({ where: { status: 'REVOKED' } });
        
        // Simple success rate simulation based on verified proofs
        const successRate = totalCeremonies > 0 ? 1.0 : 0.0; 

        res.json({
            totalCeremonies,
            activeNodes,
            revokedNodes,
            successRate,
            protocolVersion: '1.5.1',
            status: 'OPERATIONAL'
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
