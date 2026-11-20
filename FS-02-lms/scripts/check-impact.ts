import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../server/src/config/env';
import { Course } from '../server/src/models/Course';
import { Lesson } from '../server/src/models/Lesson';
import { Enrollment } from '../server/src/models/Enrollment';
import { PaymentModel } from '../server/src/models/payment.model';
import { VideoAssetModel } from '../server/src/models/video-asset.model';

async function main() {
  await mongoose.connect(env.MONGO_URI);

  const courses = await Course.find({}).select('_id slug title comingSoon totalLessons status').lean();
  const liveIds = new Set<string>();
  const soonIds = new Set<string>();
  for (const c of courses) {
    const count = await Lesson.countDocuments({ courseId: c._id });
    (count === 0 ? soonIds : liveIds).add(String(c._id));
  }

  const enrollments = await Enrollment.find({}).lean();
  const soonEnrollments = enrollments.filter((e) => soonIds.has(String(e.courseId)));
  const payments = await PaymentModel.find({}).lean();
  const soonPayments = payments.filter((p) => soonIds.has(String(p.courseId)));

  const assets = await VideoAssetModel.find({}).select('originalKey status durationSec renditions hlsPrefix').lean();

  console.log('courses:', courses.length, 'live:', liveIds.size, 'comingSoon:', soonIds.size);
  console.log('enrollments:', enrollments.length, '-> in coming-soon courses:', soonEnrollments.length);
  console.log('payments:', payments.length, '-> in coming-soon courses:', soonPayments.length);
  console.log('video assets:', assets.length);
  for (const a of assets) {
    console.log(`  - ${a.originalKey} status=${a.status} dur=${a.durationSec} renditions=${(a.renditions ?? []).map((r) => r.name).join('|') || 'none'} hls=${a.hlsPrefix ?? '-'}`);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
