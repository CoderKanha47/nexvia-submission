import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import ffmpegStatic from 'ffmpeg-static';
import { env } from '../config/env';

export interface FfmpegProgress {
  frame?: number;
  fps?: number;
  out_time?: number;
  progress?: 'continue' | 'end';
}

function resolveBinary(): string {
  if (env.FFMPEG_PATH) return env.FFMPEG_PATH;
  if (ffmpegStatic) return ffmpegStatic;
  throw new Error('FFmpeg binary not found. Set FFMPEG_PATH or install ffmpeg-static.');
}

export function parseFfmpegTime(t: string | undefined): number {
  if (!t) return 0;
  const m = /^(\d+):(\d+):([\d.]+)/.exec(t);
  if (!m) return 0;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** Run ffmpeg with args, streaming `-progress pipe:1` events. */
export async function runFfmpeg(
  args: string[],
  onProgress: (p: FfmpegProgress) => void,
): Promise<{ durationSec: number }> {
  const binary = resolveBinary();
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    let buf = '';
    let lastOutTime = 0;
    const kv: Record<string, string> = {};

    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.stdout?.on('data', (chunk: Buffer) => {
      buf += chunk.toString();
      // `-progress pipe:1` emits `key=value` lines, one block per `progress=` line.
      let nl = buf.indexOf('\n');
      while (nl >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        const m = /^(frame|fps|out_time|time|progress)=(.*)$/.exec(line);
        if (m) kv[m[1]!] = m[2]!;
        if (m && m[1] === 'progress') {
          const outTime = parseFfmpegTime(kv.out_time ?? kv.time);
          if (outTime > lastOutTime) lastOutTime = outTime;
          onProgress({
            frame: kv.frame ? Number(kv.frame) : undefined,
            fps: kv.fps ? Number(kv.fps) : undefined,
            out_time: outTime,
            progress: kv.progress === 'end' ? 'end' : 'continue',
          });
          for (const key of Object.keys(kv)) delete kv[key];
        }
        nl = buf.indexOf('\n');
      }
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-2000)}`));
        return;
      }
      resolve({ durationSec: lastOutTime });
    });
  });
}

export interface TranscodeResult {
  renditions: Array<{ name: string; width: number; height: number; bitrateKbps: number }>;
  durationSec: number;
}

/**
 * Transcode a source video to an adaptive HLS ladder and write it to outDir.
 */
export async function transcodeToHls(
  originalLocalPath: string,
  outDir: string,
  onProgress: (pct: number) => void,
): Promise<TranscodeResult> {
  mkdirSync(outDir, { recursive: true });

  const renditions = [
    { name: '360p', width: 640, height: 360, bitrateKbps: 700 },
    { name: '480p', width: 854, height: 480, bitrateKbps: 1100 },
    { name: '720p', width: 1280, height: 720, bitrateKbps: 1700 },
  ];

  const durations: number[] = [];
  for (let i = 0; i < renditions.length; i++) {
    const r = renditions[i]!;
    const hlsOut = join(outDir, r.name);
    mkdirSync(hlsOut, { recursive: true });
    const playlist = `${hlsOut}/index.m3u8`;
    const segment = `${hlsOut}/seg-%03d.ts`;

    const fps = r.name === '360p' ? 24 : 30;
    const args = [
      '-y',
      '-i',
      originalLocalPath,
      '-vf',
      `scale=w=${r.width}:h=${r.height}:force_original_aspect_ratio=decrease:force_divisible_by=2`,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-profile:v',
      'main',
      '-r',
      String(fps),
      '-b:v',
      `${r.bitrateKbps}k`,
      '-maxrate',
      `${Math.round(r.bitrateKbps * 1.15)}k`,
      '-bufsize',
      `${r.bitrateKbps * 2}k`,
      '-sc_threshold',
      '0',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-hls_list_size',
      '0',
      '-hls_time',
      '2',
      '-hls_segment_filename',
      segment,
      '-f',
      'hls',
      playlist,
      '-progress',
      'pipe:1',
      '-nostats',
    ];
    const stepPct = 100 / renditions.length;
    const result = await runFfmpeg(args, () => {
      onProgress(Math.min(99, Math.round((i * stepPct) + stepPct * 0.6)));
    });
    durations.push(result.durationSec);
  }

  const master = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    ...renditions.map(
      (r) =>
        `#EXT-X-STREAM-INF:BANDWIDTH=${r.bitrateKbps * 1200},RESOLUTION=${r.width}x${r.height}\n${r.name}/index.m3u8`,
    ),
    '',
  ].join('\n');
  await writeFile(join(outDir, 'master.m3u8'), master);

  const durationSec = durations.find((d) => d > 0) ?? 0;
  return { renditions, durationSec };
}

export function guessMime(name: string): string {
  if (name.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
  if (name.endsWith('.ts')) return 'video/mp2t';
  return 'application/octet-stream';
}

export function readBlob(path: string): Buffer {
  return readFileSync(path);
}