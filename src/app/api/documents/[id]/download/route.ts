import { NextRequest, NextResponse } from 'next/server';
import { requireTenant, requireAuthIdentity, requirePermissionFast } from '@/lib/auth';
import prisma from '@/../database/utils/prisma';
import { ProviderFactory } from '@/infrastructure/provider.factory';
import { StorageProvider } from '@/infrastructure/storage/storage.interface';

export async function GET(
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

    const document = await prisma.document.findFirst({
      where: {
        id,
        tenantId, // Canonical tenant isolation
      }
    });

    if (!document) {
      return new NextResponse('Document not found', { status: 404 });
    }

    // Verify parent CRM resource ownership & user permission
    if (document.uploadedById !== identity.id) {
      if (document.customerId) {
        await requirePermissionFast(identity.id, 'CUSTOMER', 'READ');
      } else if (document.taskId) {
        await requirePermissionFast(identity.id, 'TASK', 'READ');
      }
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

  } catch (error: any) {
    console.error('Document download route error:', error);
    if (error.message && error.message.includes('Permission denied')) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    return new NextResponse('Unauthorized or Internal Error', { status: 401 });
  }
}
