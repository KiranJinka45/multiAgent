"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
async function main() {
    const plain = "Kiran@410";
    const hash = await bcrypt_1.default.hash(plain, 10);
    console.log("HASH:", hash);
    const ok = await bcrypt_1.default.compare(plain, hash);
    console.log("MATCH:", ok);
}
main().catch((err) => {
    console.error("BCRYPT TEST FAILED:", err);
    process.exit(1);
});
//# sourceMappingURL=test-bcrypt.js.map