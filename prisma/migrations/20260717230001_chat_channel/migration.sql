ALTER TABLE "ChatConversation" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'visitor';
CREATE INDEX "ChatConversation_channel_lastMessageAt_idx" ON "ChatConversation"("channel", "lastMessageAt");
