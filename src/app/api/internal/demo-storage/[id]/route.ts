import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import { Logger } from '@/lib/logger/logger';
import { requireTenant, requireAuth } from '@/lib/auth';
import prisma from '@db/utils/prisma';

const _orig_GET = async function (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const tenantId = await requireTenant();
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return new NextResponse('Missing ID', { status: 400 });
    }

    const demoStorage = await prisma.demoStorage.findFirst({
      where: {
        id,
        tenantId, // strict canonical tenant isolation
      }
    });

    if (!demoStorage) {
      return new NextResponse('Not found', { status: 404 });
    }

    const buffer = Buffer.from(demoStorage.base64Data, 'base64');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': demoStorage.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${demoStorage.fileName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    Logger.error('DemoStorage internal route error:', error);
    return new NextResponse('Unauthorized or Internal Error', { status: 401 });
  }
}

export const GET = withApiContext(_orig_GET);
