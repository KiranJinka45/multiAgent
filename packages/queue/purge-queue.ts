import { freeQueue } from './src';

async function purge() {
  await freeQueue.drain();
  await freeQueue.obliterate({ force: true });
  console.log('Queue purged.');
  process.exit(0);
}

purge();
