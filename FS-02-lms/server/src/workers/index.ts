import { transcodeWorker } from './transcode.worker';
import { connectRedis } from '../config/redis';

async function main() {
  await connectRedis();
  console.log('Transcode worker started');

  process.on('SIGINT', async () => {
    await transcodeWorker.close();
    process.exit(0);
  });
}

void main().catch((err) => {
  console.error('Worker failed:', err);
  process.exit(1);
});
