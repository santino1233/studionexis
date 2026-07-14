-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "source" TEXT,
    "referrer" TEXT,
    "device" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageView_tenantId_createdAt_idx" ON "PageView"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_tenantId_visitorId_createdAt_idx" ON "PageView"("tenantId", "visitorId", "createdAt");

-- AddForeignKey
ALTER TABLE "PageView" ADD CONSTRAINT "PageView_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
