import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import { Logger } from '@/lib/logger/logger';
import { requireTenant, requireAuthIdentity, requirePermissionFast } from '@/lib/auth';
import { ProviderFactory } from '@/infrastructure/provider.factory';
import { StorageProvider } from '@/infrastructure/storage/storage.interface';
import { withTenant } from '@db/utils/prisma-tenant';

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
      return new NextResponse('Missing Quote ID', { status: 400 });
    }

    const hasRead = await requirePermissionFast(identity.id, 'REVENUE', 'READ');
    if (!hasRead) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const tenantPrisma = withTenant(tenantId);
    const quote = await tenantPrisma.quote.findFirst({
      where: { id, tenantId }
    });

    if (!quote) {
      return new NextResponse('Quote not found', { status: 404 });
    }
    
    // Validate Quote Version logic: the document storage key explicitly encodes the quote ID.
    // If it's a revision, it has a different quote ID.
    const storageKey = `quotes/${tenantId}/${quote.id}/quote.pdf`;

    // Resolve Provider and get signed URL
    const provider = await ProviderFactory.getForTenant('STORAGE') as StorageProvider;
    const signedUrl = await provider.getSignedUrl(storageKey, 3600);

    if (signedUrl.startsWith('/')) {
      // Local demo storage route
      const origin = request.nextUrl.origin;
      return NextResponse.redirect(`${origin}${signedUrl}`);
    }

    // External provider URL (e.g., S3 presigned URL)
    return NextResponse.redirect(signedUrl);

  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    Logger.error('Quote document download route error:', error);
    if (error.message && (error.message.includes('Permission denied') || error.message.includes('Forbidden'))) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    return new NextResponse('Unauthorized or Internal Error', { status: 401 });
  }
}

export const GET = withApiContext(_orig_GET);
