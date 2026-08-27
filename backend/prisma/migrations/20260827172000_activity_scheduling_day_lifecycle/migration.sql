-- CreateTable
CREATE TABLE "ActivitySchedulingDay" (
    "id" UUID NOT NULL,
    "activityId" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivitySchedulingDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivitySchedulingDay_activityId_idx" ON "ActivitySchedulingDay"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivitySchedulingDay_activityId_date_key" ON "ActivitySchedulingDay"("activityId", "date");

-- AddForeignKey
ALTER TABLE "ActivitySchedulingDay" ADD CONSTRAINT "ActivitySchedulingDay_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivitySchedulingDay" ADD CONSTRAINT "ActivitySchedulingDay_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
