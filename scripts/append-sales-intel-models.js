const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'database', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf-8');

// Add to Resource enum
if (!schema.includes('SALES_INTEL')) {
  schema = schema.replace(/enum Resource \{([\s\S]*?)\}/, (match, p1) => {
    return `enum Resource {${p1}  SALES_INTEL\n}`;
  });
}

// Add to Action enum
if (!schema.includes('MANAGE_TERRITORIES')) {
  schema = schema.replace(/enum Action \{([\s\S]*?)\}/, (match, p1) => {
    return `enum Action {${p1}  MANAGE_TERRITORIES\n}`;
  });
}

// Add fields to Lead
if (!schema.includes('scoreFactors')) {
  schema = schema.replace(/model Lead \{([\s\S]*?)tasks\s+Task\[\]/g, (match, p1) => {
    return `model Lead {${p1}score          Float?    @default(0)\n  scoreFactors   Json?\n  tasks        Task[]`;
  });
}

// Add fields to Deal
if (!schema.includes('probabilityFactors')) {
  schema = schema.replace(/model Deal \{([\s\S]*?)expectedCloseDate/g, (match, p1) => {
    return `model Deal {${p1}probabilityFactors Json?\n    expectedCloseDate`;
  });
}

// Add new models
const newModels = `
model Territory {
  id          String   @id @default(uuid())
  tenantId    String
  name        String
  description String?
  parentId    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant         Tenant          @relation(fields: [tenantId], references: [id])
  parent         Territory?      @relation("TerritoryHierarchy", fields: [parentId], references: [id], onDelete: Restrict)
  children       Territory[]     @relation("TerritoryHierarchy")
  userTerritories UserTerritory[]

  @@index([tenantId])
  @@index([tenantId, parentId])
}

model UserTerritory {
  id          String   @id @default(uuid())
  tenantId    String
  userId      String
  territoryId String
  role        String   @default("REP")
  createdAt   DateTime @default(now())

  tenant    Tenant    @relation(fields: [tenantId], references: [id])
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  territory Territory @relation(fields: [territoryId], references: [id], onDelete: Cascade)

  @@index([tenantId, userId])
  @@index([tenantId, territoryId])
}

model SalesQuota {
  id           String   @id @default(uuid())
  tenantId     String
  userId       String
  period       String
  targetAmount Float
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tenantId, userId])
  @@index([tenantId, period])
}

model DealSnapshot {
  id          String   @id @default(uuid())
  tenantId    String
  dealId      String
  date        DateTime @default(now())
  value       Float
  probability Int?
  stageId     String
  createdAt   DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])
  deal   Deal   @relation(fields: [dealId], references: [id], onDelete: Cascade)
  stage  PipelineStage @relation(fields: [stageId], references: [id], onDelete: Restrict)

  @@index([tenantId, dealId, date])
  @@index([tenantId, date])
}
`;

if (!schema.includes('model Territory')) {
  schema += newModels;
}

// Add Tenant relations for new models
if (!schema.includes('territories')) {
  schema = schema.replace(/quotes\s+Quote\[\]/g, `quotes                 Quote[]\n  territories            Territory[]\n  userTerritories        UserTerritory[]\n  salesQuotas            SalesQuota[]\n  dealSnapshots          DealSnapshot[]`);
}

// Add User relations for new models
if (!schema.includes('userTerritories')) {
  schema = schema.replace(/quotes\s+Quote\[\]/g, `quotes               Quote[]\n  userTerritories      UserTerritory[]\n  salesQuotas          SalesQuota[]`);
}

fs.writeFileSync(schemaPath, schema);
console.log('Schema updated successfully');
