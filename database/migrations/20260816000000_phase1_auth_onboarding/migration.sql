-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'COMPLETED');



-- AlterEnum
BEGIN;
CREATE TYPE "Resource_new" AS ENUM ('INCIDENT', 'CUSTOMER', 'CAMERA', 'USER', 'SYSTEM', 'LEAD', 'TASK', 'LOCATION', 'COMMUNICATION', 'STREAM', 'RECORDING', 'AI_EVENT');
ALTER TABLE "Permission" ALTER COLUMN "resource" TYPE "Resource_new" USING ("resource"::text::"Resource_new");
ALTER TYPE "Resource" RENAME TO "Resource_old";
ALTER TYPE "Resource_new" RENAME TO "Resource";
DROP TYPE "public"."Resource_old";
COMMIT;



-- DropIndex
DROP INDEX "User_clerkId_key";

-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "designation" TEXT,
ADD COLUMN     "employeeId" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "profilePhotoUrl" TEXT,
ALTER COLUMN "clerkId" DROP NOT NULL;





-- CreateTable
CREATE TABLE "TenantBootstrap" (
    "tenantId" TEXT NOT NULL,
    "bootstrappedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantBootstrap_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);



-- CreateIndex
CREATE INDEX "Department_tenantId_idx" ON "Department"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_tenantId_name_key" ON "Department"("tenantId", "name");



-- CreateIndex
CREATE INDEX "User_tenantId_departmentId_idx" ON "User"("tenantId", "departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- Custom Data Migration for Existing Users
UPDATE "User" SET "employeeId" = 'EMP-' || UPPER(SUBSTRING("id" FROM 1 FOR 8)) WHERE "employeeId" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_employeeId_key" ON "User"("tenantId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_clerkId_key" ON "User"("tenantId", "clerkId");

-- AddForeignKey
ALTER TABLE "TenantBootstrap" ADD CONSTRAINT "TenantBootstrap_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;



