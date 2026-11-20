import { Router } from 'express';
import { Course } from '../models/Course';
import { UserModel } from '../models/user.model';
import { LiveClassModel } from '../models/live-class.model';

export const statsRouter = Router();

statsRouter.get('/', async (_req, res) => {
  try {
    const [coursesCount, studentsCount, instructorsCount, liveClassesCount] = await Promise.all([
      Course.countDocuments({ status: 'published' }),
      UserModel.countDocuments({ role: 'student' }),
      UserModel.countDocuments({ role: 'instructor' }),
      LiveClassModel.countDocuments({ status: { $in: ['scheduled', 'live'] } }),
    ]);

    res.json({
      data: {
        courses: coursesCount,
        students: studentsCount,
        instructors: instructorsCount,
        liveClasses: liveClassesCount,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL',
        message: 'Failed to fetch statistics',
      },
    });
  }
});