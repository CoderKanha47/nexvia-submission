import 'dotenv/config';
import mongoose from 'mongoose';
import { Course } from '../server/src/models/Course';
import { Section } from '../server/src/models/Section';
import { Lesson } from '../server/src/models/Lesson';
import { VideoAssetModel } from '../server/src/models/video-asset.model';
import { env } from '../server/src/config/env';

async function inspect() {
  await mongoose.connect(env.MONGO_URI);
  console.log('=== DATABASE INSPECTION ===');

  const total = await Course.countDocuments({});
  const published = await Course.countDocuments({ status: 'published' });
  console.log(`Total courses in DB: ${total} (published: ${published})`);

  const courses = await Course.find({}).select('title slug comingSoon status totalLessons totalDurationSec priceCents level').lean();
  for (const c of courses) {
    const sections = await Section.find({ courseId: c._id }).lean();
    const sectionIds = sections.map((s) => s._id);
    const lessons = await Lesson.find({ sectionId: { $in: sectionIds } }).lean();
    const videoLessons = lessons.filter((l) => l.videoAssetId);
    const readyLessons = [];
    for (const l of videoLessons) {
      const asset = await VideoAssetModel.findById(l.videoAssetId).lean();
      readyLessons.push({ title: l.title, status: asset?.status ?? 'MISSING', hlsPrefix: asset?.hlsPrefix ?? null });
    }
    console.log(`\n[${c.comingSoon ? 'COMING SOON' : 'LIVE'}] ${c.title} (slug: ${c.slug})`);
    console.log(`  status=${c.status} sections=${sections.length} lessons=${lessons.length} totalLessons=${c.totalLessons} durationSec=${c.totalDurationSec} priceCents=${c.priceCents} level=${c.level}`);
    if (readyLessons.length > 0) {
      for (const r of readyLessons) console.log(`    lesson: ${r.title} -> videoStatus=${r.status} hls=${r.hlsPrefix}`);
    }
  }
  await mongoose.disconnect();
}

inspect().catch((err) => {
  console.error('Inspect failed:', err);
  process.exit(1);
});