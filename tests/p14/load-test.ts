import { request, sleep } from "./utils";

const USERS = 50;
const CONCURRENCY = 10;
const INTERNAL_KEY = process.env.INTERNAL_KEY || "secret_internal_key";

async function simulateUser(id: number) {
  const startTime = Date.now();
  console.log(`📡 [P14] User ${id} starting load session...`);
  
  // 1. Fetch Projects
  await request("/api/projects", "GET", null, INTERNAL_KEY);
  
  // 2. Fetch Missions
  await request("/api/missions", "GET", null, INTERNAL_KEY);
  
  // 3. Create a stress mission
  await request("/api/missions/start", "POST", {
    title: `Stress-Test-${id}`,
    type: "build",
    tenantId: "stress-tenant" 
  }, INTERNAL_KEY);

  const duration = Date.now() - startTime;
  console.log(`✅ [P14] User ${id} finished in ${duration}ms`);
}

async function runLoadTest() {
  console.log(`🔥 [P14] Starting Load Test: ${USERS} users, concurrency ${CONCURRENCY}`);
  
  const tasks = [];
  for (let i = 0; i < USERS; i++) {
    tasks.push(simulateUser(i));
    if (tasks.length >= CONCURRENCY) {
      await Promise.all(tasks);
      tasks.length = 0;
      console.log(`   -> Batch processed. Continuing...`);
      await sleep(100);
    }
  }

  await Promise.all(tasks);
  console.log("🏁 [P14] Load Test Completed Successfully.");
}

runLoadTest();
