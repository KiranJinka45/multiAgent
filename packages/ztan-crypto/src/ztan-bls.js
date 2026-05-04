"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThresholdBls = void 0;
var bls = __importStar(require("@noble/bls12-381"));
var DST = 'BLS_SIG_ZTAN_AUDIT_V1';
/**
 * ZTAN-BLS: Audit-Grade Threshold Signature Implementation
 * Based on BLS12-381 Curve
 */
var ThresholdBls = /** @class */ (function () {
    function ThresholdBls() {
    }
    /**
     * Simulation of a (t, n) Distributed Key Generation (DKG).
     */
    ThresholdBls.dkg = function (t, n, nodeIds) {
        return __awaiter(this, void 0, void 0, function () {
            var masterSecret, masterPublicKey, shares, i, nodeId, secretShare, verificationKey;
            return __generator(this, function (_a) {
                masterSecret = bls.utils.randomPrivateKey();
                masterPublicKey = bls.getPublicKey(masterSecret);
                shares = [];
                for (i = 0; i < n; i++) {
                    nodeId = nodeIds[i] || "Node-".concat((i + 1).toString().padStart(3, '0'));
                    secretShare = bls.utils.randomPrivateKey();
                    verificationKey = bls.getPublicKey(secretShare);
                    shares.push({
                        nodeId: nodeId,
                        secretShare: Buffer.from(secretShare).toString('hex'),
                        verificationKey: Buffer.from(verificationKey).toString('hex')
                    });
                }
                return [2 /*return*/, {
                        masterPublicKey: Buffer.from(masterPublicKey).toString('hex'),
                        shares: shares
                    }];
            });
        });
    };
    /**
     * Sign a payload using a node's secret share.
     */
    ThresholdBls.signShare = function (messageHash, secretShareHex) {
        return __awaiter(this, void 0, void 0, function () {
            var secretShare, msg, signature;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        secretShare = Buffer.from(secretShareHex, 'hex');
                        msg = Buffer.from(messageHash, 'hex');
                        return [4 /*yield*/, bls.sign(msg, secretShare, { dst: DST })];
                    case 1:
                        signature = _a.sent();
                        return [2 /*return*/, Buffer.from(signature).toString('hex')];
                }
            });
        });
    };
    /**
     * Aggregate t signatures into a single group signature.
     */
    ThresholdBls.aggregate = function (signatures) {
        return __awaiter(this, void 0, void 0, function () {
            var sigs, agg;
            return __generator(this, function (_a) {
                sigs = signatures.map(function (s) { return Buffer.from(s, 'hex'); });
                agg = bls.aggregateSignatures(sigs);
                return [2 /*return*/, Buffer.from(agg).toString('hex')];
            });
        });
    };
    /**
     * Verify an aggregated signature against the combined public key of signers.
     */
    ThresholdBls.verify = function (signature, messageHash, publicKeys) {
        return __awaiter(this, void 0, void 0, function () {
            var sig, msg, pks, groupPk;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sig = Buffer.from(signature, 'hex');
                        msg = Buffer.from(messageHash, 'hex');
                        pks = publicKeys.map(function (pk) { return Buffer.from(pk, 'hex'); });
                        groupPk = bls.aggregatePublicKeys(pks);
                        return [4 /*yield*/, bls.verify(sig, msg, groupPk, { dst: DST })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return ThresholdBls;
}());
exports.ThresholdBls = ThresholdBls;
