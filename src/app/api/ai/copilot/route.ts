import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import { askAssistantStream } from '@/modules/ai/assistant.service';
import { Logger } from '@/lib/logger/logger';

const _orig_POST = async function (req: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    const body = await req.json() as { message?: string; history?: any[] };
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
        } catch (eRaw: unknown) {
            const e = eRaw instanceof Error ? eRaw : new Error(String(eRaw));
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
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    Logger.error('[API] Copilot Chat Stream failed', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withApiContext(_orig_POST);
