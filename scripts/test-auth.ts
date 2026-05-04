import { spawn } from "child_process";
spawn("npx", ["tsx", "watch", "apps/auth-service/src/index.ts"], { stdio: "inherit", shell: true });
