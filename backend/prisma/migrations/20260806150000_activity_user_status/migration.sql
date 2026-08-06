-- CreateEnum
CREATE TYPE "ActivityUserStatusEnum" AS ENUM ('ACTIVE', 'HOLIDAY', 'RELEASED', 'SICK');

-- CreateTable
CREATE TABLE "ActivityUserStatus" (
    "id" UUID NOT NULL,
    "activityId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "ActivityUserStatusEnum" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityUserStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityUserStatus_activityId_idx" ON "ActivityUserStatus"("activityId");

-- CreateIndex
CREATE INDEX "ActivityUserStatus_userId_idx" ON "ActivityUserStatus"("userId");

-- CreateIndex
CREATE INDEX "ActivityUserStatus_date_idx" ON "ActivityUserStatus"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityUserStatus_activityId_userId_date_key" ON "ActivityUserStatus"("activityId", "userId", "date");

-- AddForeignKey
ALTER TABLE "ActivityUserStatus" ADD CONSTRAINT "ActivityUserStatus_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityUserStatus" ADD CONSTRAINT "ActivityUserStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
