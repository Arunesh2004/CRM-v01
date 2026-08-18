const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'database', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Ensure we don't duplicate
if (schema.includes('model Product {')) {
  console.log('Already appended.');
  process.exit(0);
}

const enums = `
enum QuoteStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  SENT
  ACCEPTED
  REJECTED
  EXPIRED
}
`;

const models = `
// ==========================================
// PHASE 10.1: REVENUE MANAGEMENT CORE
// ==========================================

model ProductCategory {
  id          String            @id @default(uuid())
  tenantId    String
  name        String
  description String?
  isActive    Boolean           @default(true)
  parentId    String?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  tenant   Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  parent   ProductCategory?  @relation("CategoryHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children ProductCategory[] @relation("CategoryHierarchy")
  products Product[]

  @@index([tenantId, parentId])
}

model ProductFamily {
  id          String    @id @default(uuid())
  tenantId    String
  name        String
  description String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  tenant   Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  products Product[]

  @@index([tenantId])
}

model Product {
  id          String          @id @default(uuid())
  tenantId    String
  categoryId  String?
  familyId    String?
  name        String
  sku         String
  description String?
  metadata    Json?
  isActive    Boolean         @default(true)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  tenant           Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  category         ProductCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  family           ProductFamily?   @relation(fields: [familyId], references: [id], onDelete: SetNull)
  priceBookEntries PriceBookEntry[]

  @@index([tenantId, sku])
  @@index([tenantId, categoryId])
  @@index([tenantId, familyId])
}

model PriceBook {
  id             String           @id @default(uuid())
  tenantId       String
  name           String
  description    String?
  currencyCode   String           @default("USD")
  isActive       Boolean          @default(true)
  effectiveFrom  DateTime?
  effectiveTo    DateTime?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  tenant         Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  entries        PriceBookEntry[]
  quotes         Quote[]
  discountRules  DiscountRule[]

  @@index([tenantId, isActive])
}

model PriceBookEntry {
  id             String        @id @default(uuid())
  tenantId       String
  productId      String
  priceBookId    String
  unitPrice      Float
  currencyCode   String        @default("USD")
  isActive       Boolean       @default(true)
  effectiveFrom  DateTime?
  effectiveTo    DateTime?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  tenant         Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  product        Product       @relation(fields: [productId], references: [id], onDelete: Cascade)
  priceBook      PriceBook     @relation(fields: [priceBookId], references: [id], onDelete: Cascade)
  quoteLineItems QuoteLineItem[]

  @@index([tenantId, priceBookId, productId])
  @@index([tenantId, productId])
}

model DiscountRule {
  id             String         @id @default(uuid())
  tenantId       String
  name           String
  description    String?
  priceBookId    String?
  maxDiscount    Float          // maximum allowable percentage
  minMargin      Float?
  approvalThreshold Float       // threshold requiring approval
  isActive       Boolean        @default(true)
  effectiveFrom  DateTime?
  effectiveTo    DateTime?
  priority       Int            @default(0)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  tenant         Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  priceBook      PriceBook?     @relation(fields: [priceBookId], references: [id], onDelete: Cascade)

  @@index([tenantId, isActive])
  @@index([tenantId, priceBookId])
}

model Quote {
  id                String         @id @default(uuid())
  tenantId          String
  customerId        String
  dealId            String
  ownerId           String
  priceBookId       String
  status            QuoteStatus    @default(DRAFT)
  expirationDate    DateTime?
  subtotal          Float          @default(0)
  discountTotal     Float          @default(0)
  taxTotal          Float          @default(0)
  grandTotal        Float          @default(0)
  previousVersionId String?        @unique
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  tenant            Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  customer          Customer       @relation(fields: [customerId], references: [id], onDelete: Cascade)
  deal              Deal           @relation(fields: [dealId], references: [id], onDelete: Cascade)
  owner             User           @relation(fields: [ownerId], references: [id], onDelete: Restrict)
  priceBook         PriceBook      @relation(fields: [priceBookId], references: [id], onDelete: Restrict)
  previousVersion   Quote?         @relation("QuoteVersions", fields: [previousVersionId], references: [id], onDelete: SetNull)
  nextVersion       Quote?         @relation("QuoteVersions")
  lineItems         QuoteLineItem[]

  @@index([tenantId, customerId])
  @@index([tenantId, dealId])
  @@index([tenantId, status])
  @@index([tenantId, createdAt])
}

model QuoteLineItem {
  id               String         @id @default(uuid())
  tenantId         String
  quoteId          String
  priceBookEntryId String
  productId        String         // De-normalized for historical stability
  quantity         Int            @default(1)
  unitPrice        Float          // Snapshot of the price at quote time
  discount         Float          @default(0)
  subtotal         Float
  metadata         Json?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  tenant           Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  quote            Quote          @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  priceBookEntry   PriceBookEntry @relation(fields: [priceBookEntryId], references: [id], onDelete: Restrict)

  @@index([tenantId, quoteId])
  @@index([tenantId, priceBookEntryId])
}
`;

// Insert enums before the first model
const firstModelIndex = schema.indexOf('model Tenant {');
schema = schema.substring(0, firstModelIndex) + enums + schema.substring(firstModelIndex);

// Append models to the end
schema += '\n' + models;

fs.writeFileSync(schemaPath, schema);
console.log('Appended Revenue models and enums successfully.');
