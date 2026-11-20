import { processSampleVideosCli } from './lib/sample-videos';

processSampleVideosCli()
  .then((results) => {
    if (results.some((r) => r.durationSec <= 0)) {
      console.error('ERROR: at least one clip has no duration');
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('Sample video processing failed:', err);
    process.exit(1);
  });
