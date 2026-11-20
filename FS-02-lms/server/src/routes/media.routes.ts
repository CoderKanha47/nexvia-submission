import type { Request, Response, NextFunction } from 'express';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, normalize, sep } from 'node:path';
import { env } from '../config/env';

const MIME: Record<string, string> = {
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function notFound(res: Response): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Media not found' } });
}

/**
 * Local disk fallback for media (no S3/CloudFront configured).
 * Mounted after the playback router so `GET /media/:id/playback` wins.
 * Requires `?expires=<epoch ms>` in the future.
 */
export function mediaRouter(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'GET') {
    next();
    return;
  }

  const expires = Number(req.query.expires ?? 0);
  if (!Number.isFinite(expires) || expires < Date.now() - 30_000) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Media URL expired' } });
    return;
  }

  let rel: string;
  try {
    // req.path is relative to the parent router (e.g., /media/hls/... or /hls/...)
    const fullPath = decodeURIComponent(req.path).replace(/^\/+/, '');
    // Strip leading 'media/' if present (mounted at /media)
    rel = fullPath.startsWith('media/') ? fullPath.slice(6) : fullPath;
  } catch {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid media path' } });
    return;
  }

  const isHls = rel.startsWith('hls/');
  const baseAbs = join(isHls ? env.HLS_DIR : env.UPLOAD_DIR);
  const relPath = isHls ? rel.slice(4) : rel;
  const abs = join(baseAbs, normalize(relPath));

  if ((abs !== baseAbs && !abs.startsWith(baseAbs + sep)) || !existsSync(abs)) {
    notFound(res);
    return;
  }
  const stat = statSync(abs);
  if (!stat.isFile()) {
    notFound(res);
    return;
  }

  const ext = abs.slice(abs.lastIndexOf('.')).toLowerCase();
  res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  createReadStream(abs).pipe(res);
}