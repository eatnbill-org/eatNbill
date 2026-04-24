ALTER TABLE "User"
ADD COLUMN "pending_email_change" TEXT,
ADD COLUMN "email_change_otp" TEXT,
ADD COLUMN "email_change_expires_at" TIMESTAMP(3),
ADD COLUMN "email_change_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "email_change_last_sent_at" TIMESTAMP(3);
