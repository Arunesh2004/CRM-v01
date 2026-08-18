-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- DropIndex
DROP INDEX "AIMemory_embedding_idx";

-- DropIndex
DROP INDEX "DocumentEmbedding_embedding_idx";

-- AlterTable
ALTER TABLE "AIMemory" ALTER COLUMN "embedding" DROP NOT NULL;

-- AlterTable
ALTER TABLE "DocumentEmbedding" ALTER COLUMN "embedding" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductFamily" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT,
    "familyId" TEXT,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceBook" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceBookEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "priceBookId" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceBookEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceBookId" TEXT,
    "maxDiscount" DOUBLE PRECISION NOT NULL,
    "minMargin" DOUBLE PRECISION,
    "approvalThreshold" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "priceBookId" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "expirationDate" TIMESTAMP(3),
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "previousVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLineItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "priceBookEntryId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductCategory_tenantId_parentId_idx" ON "ProductCategory"("tenantId", "parentId");

-- CreateIndex
CREATE INDEX "ProductFamily_tenantId_idx" ON "ProductFamily"("tenantId");

-- CreateIndex
CREATE INDEX "Product_tenantId_sku_idx" ON "Product"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "Product_tenantId_categoryId_idx" ON "Product"("tenantId", "categoryId");

-- CreateIndex
CREATE INDEX "Product_tenantId_familyId_idx" ON "Product"("tenantId", "familyId");

-- CreateIndex
CREATE INDEX "PriceBook_tenantId_isActive_idx" ON "PriceBook"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "PriceBookEntry_tenantId_priceBookId_productId_idx" ON "PriceBookEntry"("tenantId", "priceBookId", "productId");

-- CreateIndex
CREATE INDEX "PriceBookEntry_tenantId_productId_idx" ON "PriceBookEntry"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "DiscountRule_tenantId_isActive_idx" ON "DiscountRule"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "DiscountRule_tenantId_priceBookId_idx" ON "DiscountRule"("tenantId", "priceBookId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_previousVersionId_key" ON "Quote"("previousVersionId");

-- CreateIndex
CREATE INDEX "Quote_tenantId_customerId_idx" ON "Quote"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "Quote_tenantId_dealId_idx" ON "Quote"("tenantId", "dealId");

-- CreateIndex
CREATE INDEX "Quote_tenantId_status_idx" ON "Quote"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Quote_tenantId_createdAt_idx" ON "Quote"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "QuoteLineItem_tenantId_quoteId_idx" ON "QuoteLineItem"("tenantId", "quoteId");

-- CreateIndex
CREATE INDEX "QuoteLineItem_tenantId_priceBookEntryId_idx" ON "QuoteLineItem"("tenantId", "priceBookEntryId");

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFamily" ADD CONSTRAINT "ProductFamily_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "ProductFamily"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceBook" ADD CONSTRAINT "PriceBook_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceBookEntry" ADD CONSTRAINT "PriceBookEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceBookEntry" ADD CONSTRAINT "PriceBookEntry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceBookEntry" ADD CONSTRAINT "PriceBookEntry_priceBookId_fkey" FOREIGN KEY ("priceBookId") REFERENCES "PriceBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountRule" ADD CONSTRAINT "DiscountRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountRule" ADD CONSTRAINT "DiscountRule_priceBookId_fkey" FOREIGN KEY ("priceBookId") REFERENCES "PriceBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_priceBookId_fkey" FOREIGN KEY ("priceBookId") REFERENCES "PriceBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_priceBookEntryId_fkey" FOREIGN KEY ("priceBookEntryId") REFERENCES "PriceBookEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Phase 10.1: Revenue Management RLS Enforcement

-- RLS for ProductCategory
ALTER TABLE "ProductCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductCategory" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for ProductCategory" ON "ProductCategory"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE));

-- RLS for ProductFamily
ALTER TABLE "ProductFamily" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductFamily" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for ProductFamily" ON "ProductFamily"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE));

-- RLS for Product
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for Product" ON "Product"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE));

-- RLS for PriceBook
ALTER TABLE "PriceBook" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PriceBook" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for PriceBook" ON "PriceBook"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE));

-- RLS for PriceBookEntry
ALTER TABLE "PriceBookEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PriceBookEntry" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for PriceBookEntry" ON "PriceBookEntry"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE));

-- RLS for DiscountRule
ALTER TABLE "DiscountRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DiscountRule" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for DiscountRule" ON "DiscountRule"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE));

-- RLS for Quote
ALTER TABLE "Quote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Quote" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for Quote" ON "Quote"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE));

-- RLS for QuoteLineItem
ALTER TABLE "QuoteLineItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuoteLineItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for QuoteLineItem" ON "QuoteLineItem"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE));

