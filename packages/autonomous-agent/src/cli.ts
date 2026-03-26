import { runAutonomousAgent } from './index';

const prompt = process.argv.slice(2).join(' ');

if (!prompt) {
  console.error('Usage: autonomous "Your feature request here"');
  process.exit(1);
}

runAutonomousAgent(prompt).catch(console.error);
