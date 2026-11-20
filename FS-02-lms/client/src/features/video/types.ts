export type VideoStatus = 'uploaded' | 'queued' | 'processing' | 'ready' | 'failed';

export interface Rendition {
  name: string;
  width: number;
  height: number;
  bitrateKbps: number;
}

export interface VideoAsset {
  id: string;
  ownerId: string;
  courseId: string;
  originalKey: string;
  status: VideoStatus;
  hlsPrefix?: string;
  renditions: Rendition[];
  durationSec?: number;
  error?: string;
  jobId?: string;
  progressPct: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaybackInfo {
  manifestUrl: string;
  assetId: string;
  expiresAt: string;
  cookies?: Record<string, string>;
}