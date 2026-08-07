-- CreateTable
CREATE TABLE "CustomSiteOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "brief" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "stripeSessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomSiteOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomSiteOrder_stripeSessionId_key" ON "CustomSiteOrder"("stripeSessionId");

-- CreateIndex
CREATE INDEX "CustomSiteOrder_status_createdAt_idx" ON "CustomSiteOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CustomSiteOrder_tenantId_createdAt_idx" ON "CustomSiteOrder"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "CustomSiteOrder" ADD CONSTRAINT "CustomSiteOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
