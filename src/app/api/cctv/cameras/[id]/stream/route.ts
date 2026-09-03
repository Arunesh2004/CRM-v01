import { withApiContext } from '@/lib/observability/context';
import { Logger } from '@/lib/logger/logger';
import { NextRequest, NextResponse } from 'next/server';
import { generateStreamToken } from '@/modules/cctv/stream.service';

const original_GET = async function (req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const cameraId = resolvedParams.id;
    if (!cameraId) {
      return NextResponse.json({ error: 'Missing camera ID' }, { status: 400 });
    }

    const streamData = await generateStreamToken(cameraId);

    return NextResponse.json(streamData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error: any) {
    Logger.error('[Stream API] Error generating stream token:', error);
    if (error.message === 'Camera credentials not configured') {
      return NextResponse.json({ error: { code: 'MISSING_CREDENTIALS', message: 'Camera credentials must be configured before streaming.' } }, { status: 428 });
    }
    if (error.message === 'Camera not found') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    // Specifically catch auth/permission errors natively thrown by requireAuth/requirePermission
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message.includes('Forbidden') ? 403 : 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withApiContext(original_GET);
