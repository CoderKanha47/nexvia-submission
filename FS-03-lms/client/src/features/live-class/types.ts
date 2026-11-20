export type LiveStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';

export interface LiveClass {
  id: string;
  courseId: string;
  instructorId: string;
  title: string;
  description?: string;
  scheduledAt: string;
  durationMin: number;
  roomName: string;
  status: LiveStatus;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LiveClassToken {
  token: string;
  url: string;
  roomName: string;
  role: 'host' | 'participant';
}

export interface ChatMessage {
  id: string;
  liveClassId: string;
  userId: string;
  userName: string;
  role: string;
  message: string;
  createdAt: string;
}