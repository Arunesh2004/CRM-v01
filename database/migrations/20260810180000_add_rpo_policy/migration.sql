-- CreateEnum
CREATE TYPE "RpoPolicy" AS ENUM ('BASIC', 'BUSINESS', 'ENTERPRISE');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "rpoPolicy" "RpoPolicy" NOT NULL DEFAULT 'BASIC';
