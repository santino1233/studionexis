CREATE TABLE "ChatConversation" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "visitorId" TEXT NOT NULL,
  "clientId" TEXT, "name" TEXT, "contact" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "messages" JSONB NOT NULL DEFAULT '[]',
  "unreadStudio" INTEGER NOT NULL DEFAULT 0,
  "unreadVisitor" INTEGER NOT NULL DEFAULT 0,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChatConversation_tenantId_lastMessageAt_idx" ON "ChatConversation"("tenantId", "lastMessageAt");
CREATE INDEX "ChatConversation_tenantId_visitorId_idx" ON "ChatConversation"("tenantId", "visitorId");
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
