import mongoose from 'mongoose';
import { Course } from '../server/src/models/Course';

async function test() {
  await mongoose.connect('mongodb://localhost:27017/lms');

  const query1 = { status: 'published' };
  const courses1 = await Course.find(query1).select('title comingSoon').lean();
  console.log('With no comingSoon filter:', courses1.length);

  const query2 = { status: 'published', comingSoon: { $ne: true } };
  const courses2 = await Course.find(query2).select('title comingSoon').lean();
  console.log('With comingSoon filter:', courses2.length);

  await mongoose.disconnect();
}

test().catch(console.error);