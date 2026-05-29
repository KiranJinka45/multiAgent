export function defineSignal() {
  return 'mock-signal';
}
export function setHandler() {}
export async function condition(fn: () => boolean, timeout?: number): Promise<boolean> {
  const start = Date.now();
  const limit = timeout || 3600000;
  while (!fn() && Date.now() - start < limit) {
    await new Promise(r => setTimeout(r, 10));
  }
  return fn();
}
