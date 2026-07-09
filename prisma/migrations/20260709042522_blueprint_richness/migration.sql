-- AlterTable
ALTER TABLE "ClassType" ADD COLUMN     "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "defaultInstructorId" TEXT,
ADD COLUMN     "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "exceptionDates" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "goodFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "heroImage" TEXT,
ADD COLUMN     "muscles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "publicByDefault" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "recurringSlots" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "validFrom" TIMESTAMP(3),
ADD COLUMN     "validTo" TIMESTAMP(3);
