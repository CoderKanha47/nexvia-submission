import mongoose from 'mongoose';
import { env } from '../server/src/config/env';
import { QuizModel } from '../server/src/models/quiz.model';

async function checkQuizzes() {
  await mongoose.connect(env.MONGO_URI);
  const quizzes = await QuizModel.find({}).lean();
  console.log('Quizzes found:', quizzes.length);
  for (const q of quizzes) {
    console.log(`  ${q._id} - ${q.title} (course: ${q.courseId}) - ${q.questions?.length} questions`);
  }
  await mongoose.disconnect();
}

checkQuizzes().catch(err => {
  console.error(err);
  process.exit(1);
});