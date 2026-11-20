import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, parseBody, requirePageRole } from '@/lib/api-helpers';
import { flushPage, publishBus } from '@/lib/bus';

export const dynamic = 'force-dynamic';

const MAX_MANUAL_VERSIONS = 100;

export const GET = handle(async (_req: NextRequest, ctx) => {
  const { params } = ctx;
  await requirePageRole(params.id!, 'VIEW');
  const versions = await prisma.version.findMany({
    where: { pageId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      label: true,
      type: true,
      byteSize: true,
      checksum: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  return { versions };
});

const createSchema = z.object({
  label: z.string().trim().max(120).optional(),
});

/** Create a manual snapshot of the current document state. */
export const POST = handle(async (req: NextRequest, ctx) => {
  const { params } = ctx;
  const { userId } = await requirePageRole(params.id!, 'EDIT');
  const { label } = await parseBody(req, createSchema);

  // Ask sync servers to flush their in-memory docs so we snapshot the latest.
  await flushPage(params.id!);

  const doc = await prisma.pageDocument.findUnique({
    where: { pageId: params.id },
    select: { state: true },
  });
  if (!doc || doc.state.length === 0) throw new ApiError(404, 'Document not found.');

  const state = Buffer.from(doc.state);
  const checksum = createHash('sha256').update(state).digest('hex');

  // Deduplicate: identical to the most recent version → return it instead.
  const latest = await prisma.version.findFirst({
    where: { pageId: params.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, checksum: true },
  });
  if (latest?.checksum === checksum) {
    return { versionId: latest.id, duplicate: true };
  }

  const manualCount = await prisma.version.count({
    where: { pageId: params.id, type: 'MANUAL' },
  });
  if (manualCount >= MAX_MANUAL_VERSIONS) {
    // Prune the oldest manual versions to stay bounded.
    const oldest = await prisma.version.findMany({
      where: { pageId: params.id, type: 'MANUAL' },
      orderBy: { createdAt: 'asc' },
      take: manualCount - MAX_MANUAL_VERSIONS + 1,
      select: { id: true },
    });
    await prisma.version.deleteMany({ where: { id: { in: oldest.map((v) => v.id) } } });
  }

  const version = await prisma.version.create({
    data: {
      pageId: params.id!,
      label: label || null,
      snapshot: state,
      type: 'MANUAL',
      byteSize: state.length,
      checksum,
      createdById: userId,
    },
    select: { id: true, label: true, type: true, createdAt: true },
  });

  await publishBus({ type: 'version:changed', pageId: params.id! });

  return { versionId: version.id, version, duplicate: false };
});
