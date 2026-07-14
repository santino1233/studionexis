ALTER TABLE "Order" ADD COLUMN "stripeSessionId" TEXT;
CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");
