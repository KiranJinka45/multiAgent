import axios from 'axios';

const BASE_URL = process.env.VALIDATION_API_URL || 'http://localhost:3010';

export async function getSreState() {
  const res = await axios.get(`${BASE_URL}/api/v1/sre/state`);
  return res.data;
}

export async function getAuditLogs() {
  const res = await axios.get(`${BASE_URL}/api/v1/sre/audit`);
  return res.data;
}

export function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`);
  }
}
