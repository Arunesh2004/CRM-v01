-- CreateIndex
CREATE UNIQUE INDEX "PriceBookEntry_tenantId_priceBookId_productId_key" ON "PriceBookEntry"("tenantId", "priceBookId", "productId");
