-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "smsBalance" DECIMAL(12,4) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SmsTopup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsTopup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'notification',
    "status" TEXT NOT NULL,
    "sid" TEXT,
    "estCharge" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "finalCharge" DECIMAL(12,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsTopup_tenantId_createdAt_idx" ON "SmsTopup"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SmsMessage_sid_key" ON "SmsMessage"("sid");

-- CreateIndex
CREATE INDEX "SmsMessage_tenantId_createdAt_idx" ON "SmsMessage"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "SmsTopup" ADD CONSTRAINT "SmsTopup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
