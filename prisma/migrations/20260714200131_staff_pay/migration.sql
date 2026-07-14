-- AlterTable
ALTER TABLE "User" ADD COLUMN     "baseSalary" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "commissionConfig" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "commissionMode" TEXT NOT NULL DEFAULT 'percent',
ADD COLUMN     "hourlyRate" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "phone" TEXT;
