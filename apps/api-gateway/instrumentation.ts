export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initInstrumentation } = await import('@libs/observability');
    initInstrumentation('api-gateway');
  }
}
