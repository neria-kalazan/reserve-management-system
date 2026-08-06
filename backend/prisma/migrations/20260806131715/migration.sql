-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Activity" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "ActivityStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityTask" (
    "id" UUID NOT NULL,
    "activityId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskInstance" (
    "id" UUID NOT NULL,
    "activityTaskId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityTaskManpowerRequirement" (
    "id" UUID NOT NULL,
    "activityTaskId" UUID NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityTaskManpowerRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityTaskRoleRequirement" (
    "id" UUID NOT NULL,
    "activityTaskId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityTaskRoleRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityTaskQualificationRequirement" (
    "id" UUID NOT NULL,
    "activityTaskId" UUID NOT NULL,
    "qualificationId" UUID NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityTaskQualificationRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_companyId_idx" ON "Activity"("companyId");

-- CreateIndex
CREATE INDEX "ActivityTask_activityId_idx" ON "ActivityTask"("activityId");

-- CreateIndex
CREATE INDEX "TaskInstance_activityTaskId_idx" ON "TaskInstance"("activityTaskId");

-- CreateIndex
CREATE INDEX "ActivityTaskManpowerRequirement_activityTaskId_idx" ON "ActivityTaskManpowerRequirement"("activityTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityTaskManpowerRequirement_activityTaskId_key" ON "ActivityTaskManpowerRequirement"("activityTaskId");

-- CreateIndex
CREATE INDEX "ActivityTaskRoleRequirement_activityTaskId_idx" ON "ActivityTaskRoleRequirement"("activityTaskId");

-- CreateIndex
CREATE INDEX "ActivityTaskRoleRequirement_roleId_idx" ON "ActivityTaskRoleRequirement"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityTaskRoleRequirement_activityTaskId_roleId_key" ON "ActivityTaskRoleRequirement"("activityTaskId", "roleId");

-- CreateIndex
CREATE INDEX "ActivityTaskQualificationRequirement_activityTaskId_idx" ON "ActivityTaskQualificationRequirement"("activityTaskId");

-- CreateIndex
CREATE INDEX "ActivityTaskQualificationRequirement_qualificationId_idx" ON "ActivityTaskQualificationRequirement"("qualificationId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityTaskQualificationRequirement_activityTaskId_qualifi_key" ON "ActivityTaskQualificationRequirement"("activityTaskId", "qualificationId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTask" ADD CONSTRAINT "ActivityTask_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskInstance" ADD CONSTRAINT "TaskInstance_activityTaskId_fkey" FOREIGN KEY ("activityTaskId") REFERENCES "ActivityTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTaskManpowerRequirement" ADD CONSTRAINT "ActivityTaskManpowerRequirement_activityTaskId_fkey" FOREIGN KEY ("activityTaskId") REFERENCES "ActivityTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTaskRoleRequirement" ADD CONSTRAINT "ActivityTaskRoleRequirement_activityTaskId_fkey" FOREIGN KEY ("activityTaskId") REFERENCES "ActivityTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTaskRoleRequirement" ADD CONSTRAINT "ActivityTaskRoleRequirement_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTaskQualificationRequirement" ADD CONSTRAINT "ActivityTaskQualificationRequirement_activityTaskId_fkey" FOREIGN KEY ("activityTaskId") REFERENCES "ActivityTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTaskQualificationRequirement" ADD CONSTRAINT "ActivityTaskQualificationRequirement_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
