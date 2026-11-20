import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, requirePageRole } from '@/lib/api-helpers';
import { flushPage, publishBus } from '@/lib/bus';

export const dynamic = 'force-dynamic';

/**
 * Restore a version: snapshot the current state first (as RESTORE type, so the
 * restore itself is undoable), then swap in the target snapshot and bump the
 * epoch so connected clients reload into a fresh room.
 */
export const POST = handle(async (_req: NextRequest, ctx) => {
  const versionId = ctx.params['id'];
  const version = await prisma.version.findUnique({
    where: { id: versionId },
    select: { id: true, pageId: true, snapshot: true, checksum: true, label: true },
  });
  if (!version) throw new ApiError(404, 'Version not found.');

  const { userId } = await requirePageRole(version.pageId, 'EDIT');

  await flushPage(version.pageId);

  const current = await prisma.pageDocument.findUnique({
    where: { pageId: version.pageId },
    select: { state: true },
  });
  if (!current) throw new ApiError(404, 'Document not found.');

  // Guard: restoring the current state is a no-op.
  const currentChecksum = createHash('sha256').update(current.state).digest('hex');
  if (currentChecksum === version.checksum) {
    throw new ApiError(400, 'This version is already the current document.');
  }

  const target = Buffer.from(version.snapshot);

  const [, updated] = await prisma.$transaction([
    // Keep the pre-restore state so the restore itself can be undone.
    prisma.version.create({
      data: {
        pageId: version.pageId,
        label: `Before restore${version.label ? ` “${version.label}”` : ''}`,
        snapshot: Buffer.from(current.state),
        type: 'RESTORE',
        byteSize: current.state.length,
        checksum: currentChecksum,
        createdById: userId,
      },
    }),
    prisma.pageDocument.update({
      where: { pageId: version.pageId },
      data: {
        state: target,
        epoch: { increment: 1 },
        stateVersion: { increment: 1 },
      },
      select: { epoch: true },
    }),
  ]);

  // Kick connected clients out of the old room; they refetch and rejoin
  // with the new epoch (IndexedDB namespacing follows the room name).
  await publishBus({
    type: 'doc:reset',
    pageId: version.pageId,
    epoch: updated.epoch,
    reason: `Restored version${version.label ? ` “${version.label}”` : ''}`,
  });
  await publishBus({ type: 'version:changed', pageId: version.pageId });

  return { ok: true, epoch: updated.epoch };
});
