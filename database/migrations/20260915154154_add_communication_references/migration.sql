-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "referenceId" UUID,
ADD COLUMN     "referenceType" VARCHAR(50);

-- AlterTable
ALTER TABLE "MailMessage" ADD COLUMN     "referenceId" UUID,
ADD COLUMN     "referenceType" VARCHAR(50);
