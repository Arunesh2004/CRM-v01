import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import { Logger } from '@/lib/logger/logger';
import { requireTenant, requireAuthIdentity } from '@/lib/auth';
import { requireDocumentAccess } from '@/modules/crm/document/document.service';
import { ProviderFactory } from '@/infrastructure/provider.factory';
import { StorageProvider } from '@/infrastructure/storage/storage.interface';

const _orig_GET = async function (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const identity = await requireAuthIdentity();
    const tenantId = await requireTenant();
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return new NextResponse('Missing ID', { status: 400 });
    }

    let document;
    try {
      document = await requireDocumentAccess(tenantId, identity.id, id, 'READ');
    } catch (eRaw: unknown) {
      const e = eRaw instanceof Error ? eRaw : new Error(String(eRaw));
      if (e.message === 'Document not found') {
        return new NextResponse('Document not found', { status: 404 });
      }
      throw e;
    }

    // Resolve Provider and get signed URL
    const provider = await ProviderFactory.getForTenant('STORAGE') as StorageProvider;
    const signedUrl = await provider.getSignedUrl(document.storageKey, 3600);

    if (signedUrl.startsWith('/')) {
      // Local demo storage route
      const origin = request.nextUrl.origin;
      return NextResponse.redirect(`${origin}${signedUrl}`);
    }

    // External provider URL (e.g., S3 presigned URL)
    return NextResponse.redirect(signedUrl);

  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    Logger.error('Document download route error:', error);
    if (error.message && (error.message.includes('Permission denied') || error.message.includes('Forbidden'))) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    return new NextResponse('Unauthorized or Internal Error', { status: 401 });
  }
}

export const GET = withApiContext(_orig_GET);
