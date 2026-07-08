-- AlterTable
ALTER TABLE "ClassSession" ADD COLUMN     "instructorEarnings" DECIMAL(12,2),
ADD COLUMN     "revenue" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 0;
