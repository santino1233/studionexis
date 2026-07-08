-- AlterTable
ALTER TABLE "ClassType" ADD COLUMN     "description" TEXT,
ADD COLUMN     "difficulty" TEXT NOT NULL DEFAULT 'ALL_LEVELS';
