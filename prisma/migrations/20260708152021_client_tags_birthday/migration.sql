-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "birthday" TIMESTAMP(3),
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
