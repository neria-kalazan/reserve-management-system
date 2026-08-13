/*
  Warnings:

  - A unique constraint covering the columns `[googleSubject]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "googleLinkedAt" TIMESTAMP(3),
ADD COLUMN     "googleSubject" TEXT,
ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Activation" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivationOtpChallenge" (
    "id" UUID NOT NULL,
    "activationId" UUID NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivationOtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Activation_tokenHash_key" ON "Activation"("tokenHash");

-- CreateIndex
CREATE INDEX "Activation_userId_idx" ON "Activation"("userId");

-- CreateIndex
CREATE INDEX "Activation_createdByUserId_idx" ON "Activation"("createdByUserId");

-- CreateIndex
CREATE INDEX "Activation_companyId_idx" ON "Activation"("companyId");

-- CreateIndex
CREATE INDEX "Activation_expiresAt_idx" ON "Activation"("expiresAt");

-- CreateIndex
CREATE INDEX "ActivationOtpChallenge_activationId_idx" ON "ActivationOtpChallenge"("activationId");

-- CreateIndex
CREATE INDEX "ActivationOtpChallenge_expiresAt_idx" ON "ActivationOtpChallenge"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSubject_key" ON "User"("googleSubject");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- AddForeignKey
ALTER TABLE "Activation" ADD CONSTRAINT "Activation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activation" ADD CONSTRAINT "Activation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activation" ADD CONSTRAINT "Activation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationOtpChallenge" ADD CONSTRAINT "ActivationOtpChallenge_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "Activation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
