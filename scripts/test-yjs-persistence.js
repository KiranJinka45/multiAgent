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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Y = __importStar(require("yjs"));
const y_websocket_1 = require("y-websocket");
const ws_1 = __importDefault(require("ws"));
const db_1 = require("@libs/db");
// Polyfill WebSocket for node
global.WebSocket = ws_1.default;
async function runTest() {
    console.log('🚀 Starting Yjs Persistence Test...');
    const docName = `test-room-${Date.now()}`;
    const ydoc1 = new Y.Doc();
    // 1. Connect first client and add data
    console.log(`Connecting client 1 to room: ${docName}`);
    const provider1 = new y_websocket_1.WebsocketProvider('ws://localhost:3011', docName, ydoc1);
    await new Promise(r => setTimeout(r, 2000));
    ydoc1.getText('content').insert(0, 'Hello from Persistence Test!');
    console.log('Data inserted by client 1');
    await new Promise(r => setTimeout(r, 2000));
    provider1.disconnect();
    // 2. Verify data exists in Postgres
    console.log('Checking Postgres for persisted state...');
    const persistedDoc = await db_1.prisma.collaborativeDoc.findUnique({
        where: { name: docName }
    });
    if (persistedDoc && persistedDoc.updates) {
        console.log('✅ SUCCESS: Data found in Postgres.');
    }
    else {
        console.log('❌ FAILURE: Data NOT found in Postgres.');
        process.exit(1);
    }
    // 3. Connect second client and verify sync
    console.log('Connecting client 2 to verify sync from persistence...');
    const ydoc2 = new Y.Doc();
    const provider2 = new y_websocket_1.WebsocketProvider('ws://localhost:3011', docName, ydoc2);
    await new Promise(r => setTimeout(r, 3000));
    const content = ydoc2.getText('content').toString();
    if (content === 'Hello from Persistence Test!') {
        console.log('✅ SUCCESS: Client 2 synced correctly from persistence.');
    }
    else {
        console.log(`❌ FAILURE: Client 2 content mismatch. Got: "${content}"`);
        process.exit(1);
    }
    // Cleanup
    provider2.disconnect();
    await db_1.prisma.collaborativeDoc.delete({ where: { name: docName } });
    console.log('\n🏁 Yjs Persistence Test Finished Successfully.');
    process.exit(0);
}
runTest().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
//# sourceMappingURL=test-yjs-persistence.js.map