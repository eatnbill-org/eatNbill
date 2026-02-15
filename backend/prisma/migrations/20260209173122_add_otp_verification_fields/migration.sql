-- AlterTable
ALTER TABLE "User" ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_otp_sent_at" TIMESTAMP(3),
ADD COLUMN     "otp" TEXT,
ADD COLUMN     "otp_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "otp_expires_at" TIMESTAMP(3),
ADD COLUMN     "password_hash" TEXT,
ALTER COLUMN "supabase_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");
