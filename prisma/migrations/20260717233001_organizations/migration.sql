CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "ownerEmail" TEXT,
  "policies" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Tenant" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "locationLabel" TEXT;
CREATE INDEX "Tenant_organizationId_idx" ON "Tenant"("organizationId");
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
