const fs = require('fs');
const path = require('path');

const models = `
// =============================================================================
// PHASE 9: AI PLATFORM & AUTOMATION ENGINE
// =============================================================================

enum AIMemoryType {
  SHORT_TERM
  LONG_TERM
  EPISODIC
}

enum AIMemoryVisibility {
  PRIVATE_USER
  DEPARTMENT
  TENANT
}

enum AIAgentExecutionStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  WAITING_APPROVAL
}

enum WorkflowStatus {
  DRAFT
  ACTIVE
  INACTIVE
}

enum WorkflowExecutionStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}

enum WorkflowExecutionStepStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}

model DocumentEmbedding {
  id           String   @id @default(uuid())
  tenantId     String
  documentId   String
  accessLevel  String
  departmentId String?
  createdById  String
  chunkText    String
  metadata     Json?
  embedding    Unsupported("vector(1536)")?
  createdAt    DateTime @default(now())

  tenant       Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  document     Document    @relation(fields: [documentId], references: [id], onDelete: Cascade)
  department   Department? @relation(fields: [departmentId], references: [id], onDelete: SetNull)
  createdBy    User        @relation(fields: [createdById], references: [id], onDelete: Cascade)

  @@index([tenantId, documentId])
  @@index([tenantId, departmentId])
}

model DocumentPermission {
  id         String   @id @default(uuid())
  documentId String
  userId     String?
  roleId     String?
  permission String
  createdAt  DateTime @default(now())

  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  user       User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  role       Role?    @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@index([documentId, userId])
  @@index([documentId, roleId])
}

model AIMemory {
  id              String             @id @default(uuid())
  tenantId        String
  userId          String
  type            AIMemoryType
  visibility      AIMemoryVisibility
  content         String
  embedding       Unsupported("vector(1536)")?
  importanceScore Float              @default(0.0)
  source          String
  verified        Boolean            @default(false)
  approvedBy      String?
  expiresAt       DateTime?
  createdAt       DateTime           @default(now())

  tenant          Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user            User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  approver        User?              @relation("AIMemoryApprover", fields: [approvedBy], references: [id], onDelete: SetNull)

  @@index([tenantId, userId, type])
}

model AIAgentExecution {
  id            String                 @id @default(uuid())
  tenantId      String
  userId        String
  agentName     String
  correlationId String
  status        AIAgentExecutionStatus @default(PENDING)
  input         Json
  output        Json?
  createdAt     DateTime               @default(now())
  updatedAt     DateTime               @updatedAt

  tenant        Tenant                 @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user          User                   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tenantId, correlationId])
}

model AIReference {
  id            String   @id @default(uuid())
  tenantId      String
  aiExecutionId String
  documentId    String
  embeddingId   String?
  citationText  String
  createdAt     DateTime @default(now())

  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  execution     AIExecution @relation(fields: [aiExecutionId], references: [id], onDelete: Cascade)
  document      Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([tenantId, aiExecutionId])
}

model AIProviderConfig {
  id              String   @id @default(uuid())
  tenantId        String
  provider        String
  model           String
  encryptedApiKey String
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())

  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, provider])
}

model AITokenUsage {
  id            String   @id @default(uuid())
  tenantId      String
  userId        String
  workflowId    String?
  aiExecutionId String?
  model         String
  inputTokens   Int
  outputTokens  Int
  latencyMs     Int
  cost          Float
  timestamp     DateTime @default(now())

  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  workflow      Workflow? @relation(fields: [workflowId], references: [id], onDelete: SetNull)
  execution     AIExecution? @relation(fields: [aiExecutionId], references: [id], onDelete: SetNull)

  @@index([tenantId, userId, timestamp])
}

model Workflow {
  id          String         @id @default(uuid())
  tenantId    String
  name        String
  description String?
  status      WorkflowStatus @default(DRAFT)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  tenant      Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  triggers    WorkflowTrigger[]
  actions     WorkflowAction[]
  executions  WorkflowExecution[]
  tokenUsages AITokenUsage[]

  @@index([tenantId, status])
}

model WorkflowTrigger {
  id         String   @id @default(uuid())
  workflowId String
  eventType  String
  conditions Json?
  createdAt  DateTime @default(now())

  workflow   Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)

  @@index([workflowId])
}

model WorkflowAction {
  id          String   @id @default(uuid())
  workflowId  String
  actionType  String
  orderIndex  Int      @default(0)
  config      Json
  createdAt   DateTime @default(now())

  workflow    Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  steps       WorkflowExecutionStep[]

  @@index([workflowId, orderIndex])
}

model WorkflowExecution {
  id         String                  @id @default(uuid())
  workflowId String
  status     WorkflowExecutionStatus @default(PENDING)
  context    Json?
  createdAt  DateTime                @default(now())
  updatedAt  DateTime                @updatedAt

  workflow   Workflow                @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  steps      WorkflowExecutionStep[]

  @@index([workflowId, status])
}

model WorkflowExecutionStep {
  id          String                      @id @default(uuid())
  executionId String
  actionId    String
  status      WorkflowExecutionStepStatus @default(PENDING)
  result      Json?
  error       String?
  timestamp   DateTime                    @default(now())

  execution   WorkflowExecution           @relation(fields: [executionId], references: [id], onDelete: Cascade)
  action      WorkflowAction              @relation(fields: [actionId], references: [id], onDelete: Cascade)

  @@index([executionId])
}
`;

const schemaPath = path.join(__dirname, '..', 'database', 'schema.prisma');
fs.appendFileSync(schemaPath, models);
console.log('Appended Phase 9 models to schema.prisma');
