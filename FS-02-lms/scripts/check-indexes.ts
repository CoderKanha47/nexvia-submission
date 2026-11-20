import mongoose from 'mongoose';
import { env } from '../server/src/config/env';

async function checkIndexes() {
  await mongoose.connect(env.MONGO_URI);
  const collections = ['courses', 'payments', 'users', 'enrollments', 'lessonprogresses', 'certificates'];
  for (const coll of collections) {
    const indexes = await mongoose.connection.db.collection(coll).indexes();
    console.log(`\n=== ${coll} ===`);
    indexes.forEach(idx => console.log('  ', idx.name, JSON.stringify(idx.key), idx.unique ? 'UNIQUE' : ''));
  }
  await mongoose.disconnect();
}

checkIndexes().catch(err => {
  console.error(err);
  process.exit(1);
});