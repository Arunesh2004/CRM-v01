import { withApiContext } from '@/lib/observability/context';
import { NextResponse } from 'next/server';

const original_GET = async function () {
  // Liveness is purely process-level. 
  // No DB checks. No external dependency checks. No sensitive config exposed.
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}

export const GET = withApiContext(original_GET);
