ALTER TABLE "Tenant" ADD COLUMN "apiKey" TEXT;
CREATE UNIQUE INDEX "Tenant_apiKey_key" ON "Tenant"("apiKey");
