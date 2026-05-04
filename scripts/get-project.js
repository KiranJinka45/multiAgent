"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("@packages/db");
async function main() {
    const project = await db_1.db.project.findFirst();
    console.log('Project ID:', project?.id);
}
main().then(() => process.exit(0));
//# sourceMappingURL=get-project.js.map