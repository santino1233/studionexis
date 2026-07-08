-- AlterEnum
ALTER TYPE "SessionStatus" ADD VALUE 'BLOCKED';

-- AlterTable
ALTER TABLE "ClassSession" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "note" TEXT;
