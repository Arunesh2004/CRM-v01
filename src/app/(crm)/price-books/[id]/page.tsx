import { requireAuth, requireTenant, checkPermissionFast } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { PriceBookDetailClient } from './PriceBookDetailClient';
import { Resource, Action } from '@prisma/client';

export default async function PriceBookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const priceBookId = resolvedParams.id;
  
  const tenantId = await requireTenant();
  const actor = await requireAuth();
  
  const canManage = await checkPermissionFast(actor.id, Resource.REVENUE, Action.UPDATE);

  const prisma = withTenant(tenantId);
  
  const priceBook = await prisma.priceBook.findFirst({
    where: { id: priceBookId, tenantId },
  });

  if (!priceBook) return notFound();

  const entries = await prisma.priceBookEntry.findMany({
    where: { priceBookId, tenantId },
    include: { product: true },
    orderBy: { createdAt: 'desc' }
  });

  // Get active products for the dropdown
  const products = await prisma.product.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-8">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/price-books" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-[#8891B0]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-emerald-400" />
            </div>
            {priceBook.name}
          </h1>
          <p className="text-[#8891B0] mt-1">{priceBook.description || 'No description provided.'}</p>
        </div>
        <div className="ml-auto text-sm font-mono text-[#8891B0]">
          {priceBook.currencyCode}
        </div>
      </div>

      <PriceBookDetailClient 
        priceBook={priceBook} 
        entries={entries} 
        products={products}
        canManage={canManage} 
      />
    </div>
  );
}
