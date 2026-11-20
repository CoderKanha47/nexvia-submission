import { Types } from 'mongoose';
import { env } from '../config/env';
import { LiveClassModel } from '../models/live-class.model';
import { Enrollment } from '../models';
import { AppError } from '../utils/errors';
import { AccessToken } from 'livekit-server-sdk';

export interface LiveKitTokenResult {
  token: string;
  url: string;
  roomName: string;
  role: 'host' | 'participant';
}

export async function getLiveKitToken(
  liveClassId: string,
  userId: Types.ObjectId,
  userRole: string,
): Promise<LiveKitTokenResult> {
  const liveClass = await LiveClassModel.findById(liveClassId);
  if (!liveClass) throw new AppError(404, 'NOT_FOUND', 'Live class not found');

  const courseId = liveClass.courseId as Types.ObjectId;
  const isInstructor = liveClass.instructorId.toString() === userId.toString();
  const isAdmin = userRole === 'admin';

  if (!isInstructor && !isAdmin) {
    const enrolled = await Enrollment.exists({ userId, courseId });
    if (!enrolled) throw new AppError(403, 'FORBIDDEN', 'You are not enrolled in this course');
  }

  if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    throw new AppError(503, 'INTERNAL', 'LiveKit not configured');
  }

  const roomName = liveClass.roomName;
  const participantName = isInstructor ? 'Instructor' : 'Student';

  const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: userId.toString(),
    name: participantName,
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: isInstructor,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return {
    token,
    url: env.LIVEKIT_URL,
    roomName,
    role: isInstructor ? 'host' : 'participant',
  };
}

export async function startLiveClass(
  liveClassId: string,
  instructorId: Types.ObjectId,
) {
  const liveClass = await LiveClassModel.findOneAndUpdate(
    { _id: liveClassId, instructorId },
    { status: 'live', startedAt: new Date() },
    { new: true },
  );
  if (!liveClass) throw new AppError(404, 'NOT_FOUND', 'Live class not found or not owner');
  return liveClass;
}

export async function endLiveClass(
  liveClassId: string,
  instructorId: Types.ObjectId,
) {
  const liveClass = await LiveClassModel.findOneAndUpdate(
    { _id: liveClassId, instructorId },
    { status: 'ended', endedAt: new Date() },
    { new: true },
  );
  if (!liveClass) throw new AppError(404, 'NOT_FOUND', 'Live class not found or not owner');
  return liveClass;
}

export async function updateLiveClass(
  liveClassId: string,
  instructorId: Types.ObjectId,
  input: { title?: string; description?: string; scheduledAt?: Date; durationMin?: number; status?: string },
) {
  const liveClass = await LiveClassModel.findOneAndUpdate(
    { _id: liveClassId, instructorId },
    input,
    { new: true, runValidators: true },
  );
  if (!liveClass) throw new AppError(404, 'NOT_FOUND', 'Live class not found or not owner');
  return liveClass;
}

export async function getUpcomingLiveClasses(userId: Types.ObjectId) {
  const enrollments = await Enrollment.find({ userId }).select('courseId').lean();
  const courseIds = enrollments.map((e) => e.courseId);
  const now = new Date();
  return LiveClassModel.find({
    courseId: { $in: courseIds },
    scheduledAt: { $gt: now },
    status: { $in: ['scheduled', 'live'] },
  }).sort({ scheduledAt: 1 }).lean();
}