import mongoose from 'mongoose';
import { Course } from '../server/src/models/Course';
import { Section } from '../server/src/models/Section';
import { Lesson } from '../server/src/models/Lesson';
import { VideoAssetModel } from '../server/src/models/video-asset.model';

async function check() {
  await mongoose.connect('mongodb://localhost:27017/lms');

  const courses = await Course.find({}).select('_id title slug comingSoon totalLessons totalDurationSec').lean();
  console.log('=== COURSES ===');
  for (const c of courses) {
    const sections = await Section.find({ courseId: c._id }).lean();
    const sectionIds = sections.map(s => s._id);
    const lessons = await Lesson.find({ sectionId: { $in: sectionIds } }).lean();
    
    const videoAssets = await VideoAssetModel.find({ courseId: c._id }).lean();
    
    console.log(`\nCourse: ${c.title} (${c.slug})`);
    console.log(`  comingSoon: ${c.comingSoon}, totalLessons: ${c.totalLessons}, totalDurationSec: ${c.totalDurationSec}`);
    console.log(`  Sections: ${sections.length}, Lessons: ${lessons.length}`);
    console.log(`  VideoAssets: ${videoAssets.length}`);
    
    for (const lesson of lessons) {
      const videoAsset = lesson.videoAssetId ? await VideoAssetModel.findById(lesson.videoAssetId).lean() : null;
      console.log(`  Lesson: ${lesson.title} (${lesson.order}) - type: ${lesson.type}, videoAssetId: ${lesson.videoAssetId}, durationSec: ${lesson.durationSec}, videoStatus: ${videoAsset?.status || 'N/A'}, hlsPrefix: ${videoAsset?.hlsPrefix || 'N/A'}`);
    }
  }
  await mongoose.disconnect();
}

check().catch(console.error);