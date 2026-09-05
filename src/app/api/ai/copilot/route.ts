import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import { askAssistantStream } from '@/modules/ai/assistant.service';
import { Logger } from '@/lib/logger/logger';

const _orig_POST = async function (req: NextRequest) {
  try {
    const body: any = await req.json();
    const { message, history } = body;
    const requestId = req.headers.get('x-request-id') || `req_${Date.now()}`;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = askAssistantStream(message, requestId, history || []);
          for await (const chunk of generator) {
            controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
          }
        } catch (e: any) {
          controller.enqueue(`data: ${JSON.stringify({ type: 'error', message: e.message || 'Stream error' })}\n\n`);
        } finally {
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error: any) {
    Logger.error('[API] Copilot Chat Stream failed', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withApiContext(_orig_POST);
