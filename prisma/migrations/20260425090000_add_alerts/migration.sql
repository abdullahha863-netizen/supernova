CREATE TABLE "Alert" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Alert_userId_createdAt_idx" ON "Alert"("userId", "createdAt");
CREATE INDEX "Alert_userId_type_createdAt_idx" ON "Alert"("userId", "type", "createdAt");

ALTER TABLE "Alert"
ADD CONSTRAINT "Alert_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
